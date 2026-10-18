"""Turn the hand-curated data/puzzles.txt into the puzzle JSON the Worker serves.

puzzles.txt holds one block per puzzle, in date order from LAUNCH. A block is
the starter word (a verb unless marked `adjective` or `noun`) followed by one
indented line: the single sense the puzzle is about, as a short definition, then
its answers (synonyms, and for verbs specific kinds of the action, so RUN takes
TROT and GALLOP as well as SPRINT):

    RUN
      move fast on foot: SPRINT JOG DASH TROT GALLOP ...
    HAPPY adjective
      feeling or showing pleasure: GLAD CHEERFUL JOLLY ...

A starter may come back on another day only with a different sense.

The definition is shown under the starter, so it must not give away any answer
(or the starter) in any form. Long answer lists may continue on further indented
lines without a colon. `A/B` accepts
B as an alternative spelling of A, and -IZE/-ISE spellings are aliased
automatically. WordNet supplies irregular forms (RAN -> RUN) and is used,
with wordfreq, to sanity check every word.

Usage: .venv/bin/python scripts/build.py   (prints warnings, writes JSON)
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

from nltk.corpus import wordnet as wn
from wordfreq import zipf_frequency

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "puzzles.txt"
OUT = ROOT / "src" / "worker" / "puzzles.json"
LAUNCH = date(2026, 10, 18)
MIN_ANSWERS = 16
MAX_ANSWERS = 45
COMMON_ZIPF = 2.3  # at or above: a word most players will know
RARE_ZIPF = 1.0  # below: too obscure to ask for at all
WORD_RE = re.compile(r"^[A-Z]{3,}$")
# Never answers, whatever WordNet says.
BLOCKED = set(
    "FUCK SHAG HUMP BONK JAZZ EFF SHIT CRAP PISS PEE WEE DEFECATE URINATE "
    "WHORE PIMP RAPE MOLEST COPULATE FORNICATE MASTURBATE".split()
)

# ...except where a word is innocent as another part of speech (WEE = small).
BLOCKED_OK = {"adjective": {"WEE"}}
# WordNet parts of speech for each kind of puzzle.
POS = {"verb": ("v",), "adjective": ("a", "s"), "noun": ("n",)}
# Everyday words WordNet 3.0 (from 2006) lacks, checked by hand.
EXTRA_ADJECTIVES = set("TITCHY SAVVY DOUGHTY POOPED ZONKED MINTED DUFF NAFF TOASTY LIPPY HUNKY MOREISH WHIFFY JAMMY SQUIDGY GLOOPY LEGIT VINTAGE MOUTHWATERING HUBRISTIC UNFUSSY".split())
EXTRA_NOUNS = set("DOSH HALFWIT NUMBSKULL PLONKER HOEDOWN HOOTENANNY SCRAN".split())
EXTRA_VERBS = set("WHINGE TWERK SHORTCHANGE UNSHACKLE UNLATCH UNCAP TEMP TELECOMMUTE TEXT SHOWCASE COURIER BABYSIT WOOF SHOWBOAT HOICK HANDPICK".split())

EXTRA = {"verb": EXTRA_VERBS, "adjective": EXTRA_ADJECTIVES, "noun": EXTRA_NOUNS}

# WordNet's irregular forms, inverted: pos -> lemma -> {form, ...} (RAN for RUN, BETTER for GOOD).
IRREGULAR: dict[str, dict[str, set[str]]] = {}
for pos, key in (("verb", "v"), ("adjective", "a"), ("noun", "n")):
    for form, lemmas in wn._exception_map[key].items():
        for lemma in lemmas:
            IRREGULAR.setdefault(pos, {}).setdefault(lemma, set()).add(form)


def usage(word: str, pos: str = "verb") -> float:
    """Zipf frequency of a word across its common inflections, not just the base."""
    if pos == "verb":
        forms = [word, word + "s", word + "ed", word + "ing", word + "d"]
        if word.endswith("e"):
            forms.append(word[:-1] + "ing")
    elif pos == "adjective":
        forms = [word, word + "er", word + "est", word + "ly"]
    else:
        forms = [word, word + "s", word + "es"]
    return max(zipf_frequency(f, "en") for f in forms)


def related_to_starter(word: str, verb: str) -> bool:
    # OUTRUN, OVERLOOK, MISUSE etc. are the starter in disguise, not synonyms.
    return word.endswith(verb) or (word.startswith(verb) and len(word) - len(verb) <= 2)


def is_verb(word: str) -> bool:
    return is_pos(word, "verb")


def is_pos(word: str, pos: str) -> bool:
    if word.upper() in EXTRA[pos] or any(s.pos() in POS[pos] for s in wn.synsets(word.lower())):
        return True
    # Participles work as adjectives (FREEZING, CRAMMED) though WordNet lists only the verb.
    w = word.lower()
    return pos == "adjective" and w.endswith(("ing", "ed")) and bool(wn.morphy(w, "v"))


def base_of(word: str, pos: str) -> str:
    """WordNet's base form for the part of speech (HAPPIER -> HAPPY), or the word itself."""
    w = word.lower()
    bases = [wn.morphy(w, p) for p in POS[pos][:1]]
    return (bases[0] or w).upper()


def spelling_variant(word: str) -> str | None:
    if word.endswith("IZE"):
        return word[:-3] + "ISE"
    if word.endswith("ISE") and is_verb(word[:-3] + "IZE"):
        return word[:-3] + "IZE"
    return None


def parse_blocks(text: str):
    """Yield (lineno, starter, pos, definition, [token, ...])."""
    block = None
    for lineno, line in enumerate(text.splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        if not line[0].isspace():
            if block:
                yield tuple(block)
            starter, *kind = line.split()
            pos = kind[0].lower() if kind else "verb"
            if pos not in POS:
                sys.exit(f"line {lineno}: unknown part of speech '{pos}'")
            block = [lineno, starter.upper(), pos, None, []]
        elif block is None:
            sys.exit(f"line {lineno}: indented line before any verb")
        elif ":" in line:
            if block[3] is not None:
                sys.exit(f"line {lineno}: {block[1]} has more than one sense")
            definition, words = line.split(":", 1)
            block[3] = definition.strip()
            block[4] += words.upper().split()
        elif block[3] is None:
            sys.exit(f"line {lineno}: expected 'definition: WORDS' under {block[1]}")
        else:
            block[4] += line.upper().split()
    if block:
        yield tuple(block)


def base_forms(token: str) -> set[str]:
    """A label word and the verbs it could be an inflection of (FLEEING -> FLEE)."""
    t = token.lower()
    forms = {t, wn.morphy(t, "v") or t, wn.morphy(t, "a") or t, wn.morphy(t) or t}
    for suffix, repl in (("ing", ""), ("ing", "e"), ("ed", ""), ("ed", "e"), ("es", ""), ("s", ""), ("ies", "y")):
        if t.endswith(suffix):
            forms.add(t[: -len(suffix)] + repl)
    return {f.upper() for f in forms}


def label_leaks(label: str, verb: str, answers: set[str]) -> list[str]:
    """Words in a definition that would give away an answer (or the starter)."""
    return [t for t in re.findall(r"[A-Za-z]+", label) if base_forms(t) & (answers | {verb})]


def check_word(w: str, starter: str, pos: str = "verb") -> str | None:
    if not WORD_RE.match(w):
        return "not A-Z, 3+ letters"
    if w in BLOCKED and w not in BLOCKED_OK.get(pos, ()):
        return "is blocked"
    if related_to_starter(w, starter):
        return "contains the starter"
    if not is_pos(w, pos):
        return f"not a WordNet {pos}"
    base = base_of(w, pos)
    # Plural-only nouns (BUCKS, RATIONS) are fine as answers.
    if w not in EXTRA[pos] and base != w and not (pos == "noun" and w.endswith("S")):
        return f"looks inflected (base {base})"
    if usage(w.lower(), pos) < RARE_ZIPF:
        return f"very rare ({usage(w.lower(), pos):.2f})"
    return None


def main():
    puzzles, warnings, seen = [], [], set()
    for n, (lineno, verb, pos, definition, tokens) in enumerate(parse_blocks(SRC.read_text())):
        where = f"{verb} (line {lineno})"
        if (verb, definition) in seen:
            warnings.append(f"{where}: duplicate puzzle")
        seen.add((verb, definition))
        answers, forms = [], {}
        for token in tokens:
            canon, *aliases = token.split("/")
            if canon in answers:
                warnings.append(f"{where}: {canon} twice")
                continue
            answers.append(canon)
            if problem := check_word(canon, verb, pos):
                warnings.append(f"{where}: {canon} {problem}")
            for alias in aliases + [spelling_variant(canon)]:
                if alias and alias != canon:
                    forms[alias] = canon
        if leaks := label_leaks(definition, verb, set(answers)):
            warnings.append(f"{where}: definition '{definition}' gives away {', '.join(leaks)}")
        if not MIN_ANSWERS <= len(answers) <= MAX_ANSWERS:
            warnings.append(f"{where}: {len(answers)} answers")
        rare = [w for w in answers if usage(w.lower(), pos) < COMMON_ZIPF]
        if len(rare) > max(5, len(answers) // 4):
            warnings.append(f"{where}: {len(rare)} uncommon words: {' '.join(rare)}")
        for lemma in [verb, *answers]:
            for form in IRREGULAR[pos].get(lemma.lower(), ()):
                f = form.upper()
                if WORD_RE.match(f) and f not in answers:
                    forms.setdefault(f, lemma)
        puzzles.append(
            {
                "number": n + 1,
                "date": (LAUNCH + timedelta(days=n)).isoformat(),
                "starter": verb,
                "pos": pos,
                "definition": definition,
                "words": answers,
                "forms": dict(sorted(forms.items())),
            }
        )
    for w in warnings:
        print("warn:", w)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(puzzles, separators=(",", ":")))
    sizes = [len(p["words"]) for p in puzzles]
    print(
        f"{len(puzzles)} puzzles, {puzzles[0]['date']} to {puzzles[-1]['date']}, "
        f"{min(sizes)}-{max(sizes)} answers (avg {sum(sizes) / len(sizes):.0f}), {len(warnings)} warnings"
    )


if __name__ == "__main__":
    main()
