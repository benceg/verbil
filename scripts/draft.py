"""Draft candidate answers for a new single-sense puzzle, for hand curation.

For each verb sense of the starter, prints its definition and a candidate pool:
the sense's own lemmas, its troponyms ("ways to X", two levels deep) and related
senses, filtered to single, uninflected, not-too-rare words. Pick the one sense
the puzzle is about and curate from its pool. With --thesaurus, also lists
thesaurus suggestions (from the free Datamuse API) for the starter, which helps
fill out thin senses. Nothing here is a finished puzzle; every word needs a
human check.

Usage:
  .venv/bin/python scripts/draft.py walk
  .venv/bin/python scripts/draft.py walk --thesaurus
"""

import json
import re
import sys
import urllib.parse
import urllib.request

from nltk.corpus import wordnet as wn

from build import BLOCKED, COMMON_ZIPF, is_verb, related_to_starter, usage

MIN_ZIPF = 1.4


def usable(word: str, verb: str) -> bool:
    return (
        re.fullmatch(r"[a-z]{3,}", word) is not None
        and word.upper() not in BLOCKED
        and wn.morphy(word, "v") == word
        and usage(word) >= MIN_ZIPF
        and not related_to_starter(word.upper(), verb)
    )


def show(words: list[str]) -> str:
    # Uncommon words are starred so they get a second look.
    ranked = sorted(dict.fromkeys(words), key=lambda w: -usage(w))
    return " ".join(w.upper() + ("" if usage(w) >= COMMON_ZIPF else "*") for w in ranked)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    for verb in (a.upper() for a in args):
        print(verb)
        for s in wn.synsets(verb.lower(), "v"):
            tro = s.hyponyms()
            hood = [s, *tro, *(h for t in tro for h in t.hyponyms()), *s.verb_groups()]
            words = [l.name() for x in hood for l in x.lemmas() if usable(l.name(), verb)]
            if words:
                print(f"  {s.definition()}: {show(words)}")
        if "--thesaurus" in sys.argv:
            url = "https://api.datamuse.com/words?" + urllib.parse.urlencode({"ml": verb.lower(), "max": 150})
            found = [r["word"] for r in json.load(urllib.request.urlopen(url, timeout=15))]
            print(f"  (thesaurus): {show([w for w in found if usable(w, verb) and is_verb(w)])}")
        print()


if __name__ == "__main__":
    main()
