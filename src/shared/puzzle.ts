import type { Puzzle } from "./types";

export function answersOf(puzzle: Pick<Puzzle, "senses">): string[] {
  return [...new Set(puzzle.senses.flatMap((s) => s.words))];
}
