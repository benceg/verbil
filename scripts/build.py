"""Turn the hand-curated data/puzzles.txt into the puzzle JSON the Worker serves.

puzzles.txt holds one block per puzzle, in date order from LAUNCH. A block is
the starter verb followed by one indented line per sense:

    RUN
      go faster than walking: SPRINT JOG DASH ...
      be the boss of: MANAGE OPERATE DIRECT ...

Every sense counts towards the score. Each sense is labelled with a short
definition, which hints and the found-words list show, so a label must not give
away any answer (or the starter) in any form. `A/B` accepts
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
MIN_ANSWERS = 24
MAX_ANSWERS = 50
COMMON_ZIPF = 2.3  # at or above: a word most players will know
RARE_ZIPF = 1.0  # below: too obscure to ask for at all
WORD_RE = re.compile(r"^[A-Z]{3,}$")
# Never answers, whatever WordNet says.
BLOCKED = set(
    "FUCK SHAG HUMP BONK JAZZ EFF SHIT CRAP PISS PEE WEE DEFECATE URINATE "
    "WHORE PIMP RAPE MOLEST COPULATE FORNICATE MASTURBATE".split()
)

# WordNet's irregular verb forms, inverted: lemma -> {form, ...}
IRREGULAR: dict[str, set[str]] = {}
for form, lemmas in wn._exception_map["v"].items():
    for lemma in lemmas:
        IRREGULAR.setdefault(lemma, set()).add(form)


def usage(word: str) -> float:
    """Zipf frequency of a verb across its common inflections, not just the base."""
    forms = [word, word + "s", word + "ed", word + "ing", word + "d"]
    if word.endswith("e"):
        forms.append(word[:-1] + "ing")
    return max(zipf_frequency(f, "en") for f in forms)


def related_to_starter(word: str, verb: str) -> bool:
    # OUTRUN, OVERLOOK, MISUSE etc. are the starter in disguise, not synonyms.
    return word.endswith(verb) or (word.startswith(verb) and len(word) - len(verb) <= 2)


def is_verb(word: str) -> bool:
    return bool(wn.synsets(word.lower(), "v"))


def spelling_variant(word: str) -> str | None:
    if word.endswith("IZE"):
        return word[:-3] + "ISE"
    if word.endswith("ISE") and is_verb(word[:-3] + "IZE"):
        return word[:-3] + "IZE"
    return None


def parse_blocks(text: str):
    """Yield (lineno, verb, [(label, [token, ...]), ...])."""
    block = None
    for lineno, line in enumerate(text.splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        if not line[0].isspace():
            if block:
                yield block
            block = (lineno, line.strip().upper(), [])
        elif block is None or ":" not in line:
            sys.exit(f"line {lineno}: expected an indented 'label: WORDS' line under a verb")
        else:
            label, words = line.split(":", 1)
            block[2].append((label.strip(), words.upper().split()))
    if block:
        yield block


def base_forms(token: str) -> set[str]:
    """A label word and the verbs it could be an inflection of (FLEEING -> FLEE)."""
    t = token.lower()
    forms = {t, wn.morphy(t, "v") or t, wn.morphy(t) or t}
    for suffix, repl in (("ing", ""), ("ing", "e"), ("ed", ""), ("ed", "e"), ("es", ""), ("s", ""), ("ies", "y")):
        if t.endswith(suffix):
            forms.add(t[: -len(suffix)] + repl)
    return {f.upper() for f in forms}


def label_leaks(label: str, verb: str, answers: set[str]) -> list[str]:
    """Words in a sense label that would give away an answer (or the starter)."""
    return [t for t in re.findall(r"[A-Za-z]+", label) if base_forms(t) & (answers | {verb})]


def check_word(w: str, verb: str) -> str | None:
    if not WORD_RE.match(w):
        return "not A-Z, 3+ letters"
    if w in BLOCKED:
        return "is blocked"
    if related_to_starter(w, verb):
        return "contains the starter"
    if not is_verb(w):
        return "not a WordNet verb"
    base = wn.morphy(w.lower(), "v")
    if base != w.lower():
        return f"looks inflected (base {base.upper()})"
    if usage(w.lower()) < RARE_ZIPF:
        return f"very rare ({usage(w.lower()):.2f})"
    return None


def main():
    puzzles, warnings, seen = [], [], set()
    for n, (lineno, verb, senses) in enumerate(parse_blocks(SRC.read_text())):
        where = f"{verb} (line {lineno})"
        if verb in seen:
            warnings.append(f"{where}: duplicate starter")
        seen.add(verb)
        answers, forms, out_senses = [], {}, []
        for label, tokens in senses:
            words = []
            for token in tokens:
                canon, *aliases = token.split("/")
                if canon in words:
                    warnings.append(f"{where}: {canon} twice in '{label}'")
                    continue
                words.append(canon)
                if canon not in answers:
                    answers.append(canon)
                    if problem := check_word(canon, verb):
                        warnings.append(f"{where}: {canon} {problem}")
                for alias in aliases + [spelling_variant(canon)]:
                    if alias and alias != canon:
                        forms[alias] = canon
            out_senses.append({"label": label, "words": words})
        for sense in out_senses:
            if leaks := label_leaks(sense["label"], verb, set(answers)):
                warnings.append(f"{where}: label '{sense['label']}' gives away {', '.join(leaks)}")
        if not MIN_ANSWERS <= len(answers) <= MAX_ANSWERS:
            warnings.append(f"{where}: {len(answers)} answers")
        rare = [w for w in answers if usage(w.lower()) < COMMON_ZIPF]
        if len(rare) > max(4, len(answers) // 6):
            warnings.append(f"{where}: {len(rare)} uncommon words: {' '.join(rare)}")
        for lemma in [verb, *answers]:
            for form in IRREGULAR.get(lemma.lower(), ()):
                f = form.upper()
                if WORD_RE.match(f) and f not in answers:
                    forms.setdefault(f, lemma)
        puzzles.append(
            {
                "number": n + 1,
                "date": (LAUNCH + timedelta(days=n)).isoformat(),
                "verb": verb,
                "senses": out_senses,
                "forms": dict(sorted(forms.items())),
            }
        )
    for w in warnings:
        print("warn:", w)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(puzzles, separators=(",", ":")))
    sizes = [len({w for s in p["senses"] for w in s["words"]}) for p in puzzles]
    print(
        f"{len(puzzles)} puzzles, {puzzles[0]['date']} to {puzzles[-1]['date']}, "
        f"{min(sizes)}-{max(sizes)} answers (avg {sum(sizes) / len(sizes):.0f}), {len(warnings)} warnings"
    )


if __name__ == "__main__":
    main()
