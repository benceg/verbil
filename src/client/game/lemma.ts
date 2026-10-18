import type { Puzzle } from "../../shared/types";

export type Verdict = { kind: "answer"; word: string } | { kind: "starter" } | { kind: "unknown" };

/** Possible base forms of an inflected verb: JOGGING -> JOG, CARRIED -> CARRY, ... */
export function baseForms(word: string): string[] {
  const out = [word];
  const add = (stem: string) => {
    if (stem.length < 2) return;
    out.push(stem);
    if (stem.length >= 3 && stem.at(-1) === stem.at(-2)) out.push(stem.slice(0, -1)); // JOGG -> JOG
    if (stem.endsWith("CK")) out.push(stem.slice(0, -1)); // PANICK -> PANIC
  };
  if (word.endsWith("IES") || word.endsWith("IED")) out.push(`${word.slice(0, -3)}Y`);
  if (word.endsWith("ES")) add(word.slice(0, -2));
  if (word.endsWith("S") && !word.endsWith("SS")) add(word.slice(0, -1));
  if (word.endsWith("ED")) {
    add(word.slice(0, -2));
    add(word.slice(0, -1));
  }
  if (word.endsWith("ING")) {
    const stem = word.slice(0, -3);
    add(stem);
    add(`${stem}E`);
    if (word.endsWith("YING")) out.push(`${word.slice(0, -4)}IE`); // DYING -> DIE
  }
  return [...new Set(out)];
}

export function judge(input: string, puzzle: Puzzle, answers: Set<string>): Verdict {
  for (const base of baseForms(input)) {
    for (const word of [base, puzzle.forms[base]]) {
      if (!word) continue;
      if (word === puzzle.verb) return { kind: "starter" };
      if (answers.has(word)) return { kind: "answer", word };
    }
  }
  return { kind: "unknown" };
}
