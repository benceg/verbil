import { describe, expect, it } from "vitest";
import data from "../../worker/puzzles.json";
import { answersOf } from "../../shared/puzzle";
import type { Puzzle } from "../../shared/types";
import { emptyHints, hintText, knownSenses, liveCards, MAX_LEVEL, mask, moreHelp, newHint, countsByLength } from "./hints";
import { baseForms, judge } from "./lemma";
import { percent, tierFor } from "./scoring";
import { shareText } from "./share";
import { streak, type Progress } from "./storage";

const puzzles = data as unknown as Puzzle[];
const run = puzzles.find((p) => p.verb === "RUN")!;
const runAnswers = new Set(answersOf(run));

describe("judge", () => {
  it("accepts answers and inflections of answers", () => {
    expect(judge("SPRINT", run, runAnswers)).toEqual({ kind: "answer", word: "SPRINT" });
    expect(judge("JOGGING", run, runAnswers)).toEqual({ kind: "answer", word: "JOG" });
    expect(judge("SCURRIED", run, runAnswers)).toEqual({ kind: "answer", word: "SCURRY" });
    expect(judge("MANAGES", run, runAnswers)).toEqual({ kind: "answer", word: "MANAGE" });
    expect(judge("FLED", run, runAnswers)).toEqual({ kind: "answer", word: "FLEE" });
  });

  it("recognises the starter in any form", () => {
    expect(judge("RUN", run, runAnswers)).toEqual({ kind: "starter" });
    expect(judge("RAN", run, runAnswers)).toEqual({ kind: "starter" });
    expect(judge("RUNNING", run, runAnswers)).toEqual({ kind: "starter" });
  });

  it("rejects words that aren't answers", () => {
    expect(judge("BANANA", run, runAnswers)).toEqual({ kind: "unknown" });
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
    const texts = [hintText(run, card)];
    for (let i = 0; i < MAX_LEVEL; i++) {
      state = moreHelp(state, card.target);
      texts.push(hintText(run, state.cards[0]));
    }
    expect(texts[1]).toContain(`starting with ${card.target[0]}`);
    expect(texts[2]).toContain(mask(card.target));
    for (const t of texts) expect(t).not.toContain(card.target);
  });

  it("points at the least explored sense first", () => {
    const state = newHint(run, ["SPRINT", "JOG"], emptyHints());
    const sense = run.senses.find((s) => s.words.includes(state.cards[0].target))!;
    expect(sense.words).not.toContain("SPRINT");
  });

  it("drops hints once their word is found", () => {
    let state = newHint(run, [], emptyHints());
    state = newHint(run, [], state);
    expect(state.cards).toHaveLength(2);
    const found = [state.cards[0].target];
    expect(liveCards(state, new Set(found))).toHaveLength(1);
    expect(newHint(run, found, state).cards.map((c) => c.target)).not.toContain(found[0]);
  });

  it("reveals the sense a hint points at", () => {
    const state = newHint(run, [], emptyHints());
    expect(knownSenses(run, new Set(), state).size).toBe(1);
  });

  it("counts found and total words by length", () => {
    const sense = run.senses[0];
    const counts = countsByLength(sense, new Set(["SPRINT"]));
    expect([...counts.values()].reduce((a, c) => a + c.total, 0)).toBe(sense.words.length);
    expect(counts.get(6)!.found).toBe(1);
  });

  it("has nothing to add when everything is found", () => {
    expect(newHint(run, answersOf(run), emptyHints()).cards).toHaveLength(0);
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
  it("has a year of puzzles with enough answers", () => {
    expect(puzzles).toHaveLength(365);
    for (const p of puzzles) expect(answersOf(p).length).toBeGreaterThanOrEqual(24);
    for (const p of puzzles) expect(answersOf(p).length).toBeLessThanOrEqual(50);
  });

  it("keeps sense labels free of answers", () => {
    for (const p of puzzles) {
      const answers = new Set(answersOf(p));
      for (const s of p.senses) for (const w of s.label.toUpperCase().match(/[A-Z]+/g) ?? []) expect(answers).not.toContain(w);
    }
  });

  it("never accepts the starter itself as an answer", () => {
    for (const p of puzzles) expect(answersOf(p)).not.toContain(p.verb);
  });
});
