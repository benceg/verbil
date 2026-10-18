"""Sense check: list answers that WordNet can't connect to their starter.

An answer counts as connected if one of its verb senses is within two hops
(synonym, hypernym, troponym, verb group, or a shared parent) of one of the
starter's verb senses. Unconnected answers aren't necessarily wrong (WordNet's
coverage is patchy) but they are the ones worth a human look.

Usage: .venv/bin/python scripts/check.py [VERB ...]
"""

import json
import sys

from nltk.corpus import wordnet as wn

from build import OUT


def neighbourhood(verb: str) -> set:
    near = set()
    for s in wn.synsets(verb.lower(), "v"):
        ring = {s, *s.hypernyms(), *s.hyponyms(), *s.verb_groups(), *s.also_sees()}
        for r in list(ring):
            ring |= {*r.hypernyms(), *r.hyponyms(), *r.verb_groups()}
        near |= ring
    return near


def main():
    only = {v.upper() for v in sys.argv[1:]}
    total = flagged = 0
    for p in json.loads(OUT.read_text()):
        if only and p["starter"] not in only or p["pos"] != "verb":
            continue
        near = neighbourhood(p["starter"])
        words = p["words"]
        loose = [w for w in words if not set(wn.synsets(w.lower(), "v")) & near]
        total += len(words)
        flagged += len(loose)
        if loose:
            print(f"{p['starter']}: {' '.join(loose)}")
    print(f"# {flagged}/{total} answers not connected in WordNet ({flagged / total:.0%})")


if __name__ == "__main__":
    main()
