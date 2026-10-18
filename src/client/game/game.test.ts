import { describe, expect, it } from "vitest";
import data from "../../worker/puzzles.json";
import { answersOf } from "../../shared/puzzle";
import type { Puzzle } from "../../shared/types";
import { emptyHints, mask, nextHint } from "./hints";
import { baseForms, judge } from "./lemma";
import { percent, tierFor } from "./scoring";
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
    expect(tierFor(0, 40).label).toBe("Not started");
    expect(tierFor(1, 40).label).toBe("Nibbling");
    expect(tierFor(32, 40).label).toBe("Gerbrilliant!");
    expect(tierFor(40, 40).label).toBe("Smashdown!");
    expect(percent(39, 40)).toBe(97);
  });
});

describe("hints", () => {
  it("narrows in on one word and eventually masks it", () => {
    const found = ["SPRINT", "JOG"];
    let state = nextHint(run, found, emptyHints());
    const target = state.target!;
    while (state.plan.length) state = nextHint(run, found, state);
    expect(state.target).toBe(target);
    expect(state.log.length).toBeLessThanOrEqual(5);
    expect(state.log.at(-1)).toContain(mask(target));
    expect(found).not.toContain(target);
  });

  it("introduces untouched senses first", () => {
    const state = nextHint(run, ["SPRINT"], emptyHints());
    expect(state.log[0]).toContain("can also mean");
    expect(state.senses).toHaveLength(1);
  });

  it("moves on once the target is found", () => {
    const first = nextHint(run, [], emptyHints());
    const next = nextHint(run, [first.target!], first);
    expect(next.target).not.toBe(first.target);
  });

  it("has nothing to say when everything is found", () => {
    const all = answersOf(run);
    expect(nextHint(run, all, emptyHints()).log).toHaveLength(0);
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
  });

  it("never accepts the starter itself as an answer", () => {
    for (const p of puzzles) expect(answersOf(p)).not.toContain(p.verb);
  });
});
