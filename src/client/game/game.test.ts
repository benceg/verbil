import { describe, expect, it } from "vitest";
import data from "../../worker/puzzles.json";
import type { Puzzle } from "../../shared/types";
import { countsByLength, emptyHints, hintText, liveCards, MAX_LEVEL, mask, moreHelp, newHint } from "./hints";
import { baseForms, judge } from "./lemma";
import { percent, tierFor } from "./scoring";
import { shareText } from "./share";
import { checkStorageVersion, loadProgress, type Progress, saveProgress, STORAGE_VERSION, streak } from "./storage";

const puzzles = data as unknown as Puzzle[];
const run = puzzles[0];
const byStarter = (s: string) => puzzles.find((p) => p.starter === s)!;
const runAnswers = new Set(run.words);

describe("judge", () => {
  it("accepts answers and inflections of answers", () => {
    expect(judge("SPRINT", run, runAnswers)).toEqual({ kind: "answer", word: "SPRINT" });
    expect(judge("JOGGING", run, runAnswers)).toEqual({ kind: "answer", word: "JOG" });
    expect(judge("SCURRIED", run, runAnswers)).toEqual({ kind: "answer", word: "SCURRY" });
    expect(judge("GALLOPING", run, runAnswers)).toEqual({ kind: "answer", word: "GALLOP" });
    expect(judge("TROTTED", run, runAnswers)).toEqual({ kind: "answer", word: "TROT" });
    expect(judge("FLED", run, runAnswers)).toEqual({ kind: "answer", word: "FLEE" });
  });

  it("recognises the starter in any form", () => {
    expect(judge("RUN", run, runAnswers)).toEqual({ kind: "starter" });
    expect(judge("RAN", run, runAnswers)).toEqual({ kind: "starter" });
    expect(judge("RUNNING", run, runAnswers)).toEqual({ kind: "starter" });
  });

  it("rejects words that aren't answers", () => {
    expect(judge("BANANA", run, runAnswers)).toEqual({ kind: "unknown" });
    // Only the puzzle's one sense counts: RUN as in "move fast on foot", not "manage".
    expect(judge("MANAGE", run, runAnswers)).toEqual({ kind: "unknown" });
    // Comparatives only count for adjectives.
    expect(judge("RACER", run, runAnswers)).toEqual({ kind: "unknown" });
  });

  it("accepts comparatives for adjectives and plurals for nouns", () => {
    const happy = byStarter("HAPPY");
    const words = new Set(happy.words);
    expect(judge("JOLLIER", happy, words)).toEqual({ kind: "answer", word: "JOLLY" });
    expect(judge("MERRIEST", happy, words)).toEqual({ kind: "answer", word: "MERRY" });
    expect(judge("HAPPIER", happy, words)).toEqual({ kind: "starter" });
    const fool = byStarter("FOOL");
    expect(judge("IDIOTS", fool, new Set(fool.words))).toEqual({ kind: "answer", word: "IDIOT" });
  });

  it("finds base forms", () => {
    expect(baseForms("DYING")).toContain("DIE");
    expect(baseForms("PANICKED")).toContain("PANIC");
    expect(baseForms("HOPED")).toContain("HOPE");
    expect(baseForms("HOPPED")).toContain("HOP");
  });
});

describe("scoring", () => {
  it("maps progress to tiers", () => {
    expect(tierFor(0, 40).label).toBe("Parking");
    expect(tierFor(1, 40).label).toBe("Scampering");
    expect(tierFor(32, 40).label).toBe("Sprinting");
    expect(tierFor(40, 40).label).toBe("Smashdown!");
    expect(percent(39, 40)).toBe(97);
  });
});

describe("hints", () => {
  it("gets more specific without ever naming an answer", () => {
    let state = newHint(run, ["SPRINT"], emptyHints());
    const card = state.cards[0];
    const texts = [hintText(card)];
    for (let i = 0; i < MAX_LEVEL; i++) {
      state = moreHelp(state, card.target);
      texts.push(hintText(state.cards[0]));
    }
    expect(texts).toHaveLength(2);
    expect(texts[0]).toBe(`A ${card.target.length}-letter word starting with ${card.target[0]}.`);
    expect(texts[1]).toContain(mask(card.target));
    for (const t of texts) expect(t).not.toContain(card.target);
  });

  it("points at the word length explored least", () => {
    const threes = run.words.filter((w) => w.length === 3);
    const state = newHint(run, threes, emptyHints());
    expect(state.cards[0].target.length).not.toBe(3);
  });

  it("drops hints once their word is found", () => {
    let state = newHint(run, [], emptyHints());
    state = newHint(run, [], state);
    expect(state.cards).toHaveLength(2);
    const found = [state.cards[0].target];
    expect(liveCards(state, new Set(found))).toHaveLength(1);
    expect(newHint(run, found, state).cards.map((c) => c.target)).not.toContain(found[0]);
  });

  it("counts found and total words by length", () => {
    const counts = countsByLength(run.words, new Set(["SPRINT"]));
    expect([...counts.values()].reduce((a, c) => a + c.total, 0)).toBe(run.words.length);
    expect([...counts.keys()]).toEqual([...counts.keys()].sort((a, b) => a - b));
    expect(counts.get(6)!.found).toBe(1);
  });

  it("has nothing to add when everything is found", () => {
    expect(newHint(run, run.words, emptyHints()).cards).toHaveLength(0);
  });
});

describe("share text", () => {
  it("matches the agreed format", () => {
    expect(shareText(30, 49)).toBe("Verbil (verbil.fun)\nCantering 🟧🟧🟧🟧🟧🟧⬜⬜⬜⬜\n30/49 words - 61%");
  });

  it("fills the bar only when every word is found", () => {
    expect(shareText(49, 49)).toContain("Smashdown! " + "🟧".repeat(10));
    expect(shareText(48, 49)).toContain("🟧".repeat(9) + "⬜");
    expect(shareText(1, 49)).toContain("Scampering 🟧" + "⬜".repeat(9));
  });
});

describe("streak", () => {
  const played = (d: string): Progress => ({ found: ["X"], hints: emptyHints(), startedOn: d });
  it("counts consecutive days played on the day", () => {
    const p = { "2026-10-20": played("2026-10-20"), "2026-10-19": played("2026-10-19"), "2026-10-17": played("2026-10-17") };
    expect(streak("2026-10-20", p)).toBe(2);
    expect(streak("2026-10-21", p)).toBe(2);
    expect(streak("2026-10-22", p)).toBe(0);
  });
});

describe("puzzle data", () => {
  it("runs daily for a year from launch with enough answers each", () => {
    expect(puzzles.length).toBeGreaterThanOrEqual(365);
    puzzles.forEach((p, i) => expect(p.number).toBe(i + 1));
    for (const p of puzzles) expect(p.words.length).toBeGreaterThanOrEqual(16);
    for (const p of puzzles) expect(p.words.length).toBeLessThanOrEqual(45);
  });

  it("starts with RUN and only repeats a starter with a new sense, months later", () => {
    expect(run.starter).toBe("RUN");
    expect(run.definition).toBe("move fast on foot");
    const seen = new Map<string, number>();
    puzzles.forEach((p, i) => {
      const key = `${p.starter}/${p.pos}`;
      if (seen.has(key)) {
        expect(i - seen.get(key)!).toBeGreaterThanOrEqual(120);
        expect(puzzles[seen.get(key)!].definition).not.toBe(p.definition);
      }
      seen.set(key, i);
    });
  });

  it("mixes in adjectives and nouns", () => {
    const kinds = new Set(puzzles.map((p) => p.pos));
    expect(kinds).toEqual(new Set(["verb", "adjective", "noun"]));
  });

  it("keeps definitions free of answers", () => {
    for (const p of puzzles) {
      const answers = new Set([...p.words, p.starter]);
      for (const w of p.definition.toUpperCase().match(/[A-Z]+/g) ?? []) expect(answers).not.toContain(w);
    }
  });

  it("never accepts the starter itself as an answer", () => {
    for (const p of puzzles) expect(p.words).not.toContain(p.starter);
  });
});

describe("storage version", () => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  } as Storage;

  it("clears old data when the version is missing, keeping chosen settings", () => {
    store.clear();
    saveProgress("2026-10-18", { found: ["MANAGE"], hints: emptyHints() });
    store.set("verbil:v1:seen-help", "1");
    store.set("verbil:v1:animate", "off");
    store.set("someone-else", "x");
    checkStorageVersion(["verbil:v1:animate"]);
    expect(loadProgress("2026-10-18").found).toEqual([]);
    expect(store.get("verbil:v1:seen-help")).toBeUndefined();
    expect(store.get("verbil:v1:animate")).toBe("off");
    expect(store.get("someone-else")).toBe("x");
    expect(store.get("verbil:version")).toBe(String(STORAGE_VERSION));
  });

  it("clears data from an older version but keeps current data", () => {
    store.clear();
    store.set("verbil:version", String(STORAGE_VERSION - 1));
    saveProgress("2026-10-18", { found: ["SPRINT"], hints: emptyHints() });
    checkStorageVersion();
    expect(loadProgress("2026-10-18").found).toEqual([]);
    saveProgress("2026-10-18", { found: ["SPRINT"], hints: emptyHints() });
    checkStorageVersion();
    expect(loadProgress("2026-10-18").found).toEqual(["SPRINT"]);
  });
});
