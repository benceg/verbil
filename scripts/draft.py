"""Draft puzzle blocks from WordNet, for hand curation into data/puzzles.txt.

For each common starter verb, every verb sense contributes its own lemmas,
its hypernyms and its troponyms ("ways to X"). Obvious chaff is filtered out
automatically: multi-word lemmas, inflections, very rare words and generic
verbs such as MOVE or GET that turn up as hypernyms everywhere. What's left
still needs a human pass; the drafts are a starting point, not puzzles.

Usage:
  .venv/bin/python scripts/draft.py            # all starters -> data/drafts.txt
  .venv/bin/python scripts/draft.py run walk   # print drafts for given verbs
"""

import re
import sys
from pathlib import Path

from nltk.corpus import wordnet as wn
from wordfreq import top_n_list

from build import BLOCKED, COMMON_ZIPF, ROOT, related_to_starter, usage

OUT = ROOT / "data" / "drafts.txt"
DRAFT_ZIPF = 2.0  # rarer words only survive if they're a true synonym (same synset)
SYNONYM_ZIPF = 1.5
MIN_DRAFT = 30
GENERIC = set(
    "be have do make get go come take give put set move travel change act cause use "
    "become let keep see say think know want need seem leave turn hold bring show try "
    "start begin continue happen occur exist remain stay feel".split()
)


def single(name: str) -> bool:
    return re.fullmatch(r"[a-z]{3,}", name) is not None


def keep(word: str, verb: str, min_zipf: float) -> bool:
    return (
        single(word)
        and not related_to_starter(word, verb)
        and wn.morphy(word, "v") == word
        and usage(word) >= min_zipf
        and word.upper() not in BLOCKED
    )


def unsuitable(definition: str) -> bool:
    return re.search(r"\bsex|bowel|urin|excret", definition) is not None


def draft(verb: str) -> list[tuple[int, str, list[str]]]:
    """[(starter's frequency in this sense, definition, words), ...]"""
    senses, taken = [], set()
    for s in wn.synsets(verb, "v"):
        own = [l for l in s.lemmas() if l.name() == verb]
        if not own or unsuitable(s.definition()):
            continue
        words = []
        for l in s.lemmas():
            if keep(l.name(), verb, SYNONYM_ZIPF):
                words.append(l.name())
        for rel in s.hypernyms() + s.hyponyms() + s.verb_groups():
            for l in rel.lemmas():
                w = l.name()
                if w not in GENERIC and keep(w, verb, DRAFT_ZIPF):
                    words.append(w)
        words = [w for w in dict.fromkeys(words) if w not in taken]
        taken.update(words)
        if words:
            senses.append((own[0].count(), s.definition(), words))
    return senses


def fmt(verb: str, senses) -> str:
    lines = [verb.upper()]
    for count, definition, words in senses:
        shown = [w.upper() if usage(w) >= COMMON_ZIPF else w for w in words]
        lines.append(f"  {definition[:50]}: {' '.join(shown[:25])}")
    return "\n".join(lines)


def starters():
    for w in top_n_list("en", 15000):
        if single(w) and wn.morphy(w, "v") == w and usage(w) >= 3.5:
            v = sum(l.count() for s in wn.synsets(w, "v") for l in s.lemmas() if l.name() == w)
            n = sum(l.count() for s in wn.synsets(w) if s.pos() != "v" for l in s.lemmas() if l.name() == w)
            if v >= 3 and v >= n:
                yield w


def main():
    if sys.argv[1:]:
        for verb in sys.argv[1:]:
            print(fmt(verb, draft(verb)))
        return
    blocks = []
    for verb in starters():
        senses = draft(verb)
        total = sum(len(ws) for _, _, ws in senses)
        if total >= MIN_DRAFT:
            blocks.append(f"# {total} words\n" + fmt(verb, senses))
    OUT.write_text("\n\n".join(blocks) + "\n")
    print(f"{len(blocks)} drafts -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
