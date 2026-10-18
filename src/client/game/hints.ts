import type { Puzzle } from "../../shared/types";

/**
 * A hint points at one unfound word. It starts with the word's length and first
 * letter (the length alone adds nothing to the hints grid), and the player can ask
 * for a partly filled-in mask.
 * Hints for words the player has since found simply drop away.
 */
export interface HintCard {
  target: string;
  level: number;
}

export interface HintState {
  cards: HintCard[];
  /** Total hints ever requested for this puzzle. */
  used: number;
}

export const MAX_LEVEL = 1;

export const emptyHints = (): HintState => ({ cards: [], used: 0 });

export function mask(word: string): string {
  return [...word].map((ch, i) => (i === 0 || i % 3 === 0 ? ch : "_")).join(" ");
}

export function liveCards(state: HintState, found: Set<string>): HintCard[] {
  return state.cards.filter((c) => !found.has(c.target));
}

function pickTarget(puzzle: Puzzle, found: Set<string>, taken: Set<string>, turn: number): string | undefined {
  const open = puzzle.words.filter((w) => !found.has(w) && !taken.has(w));
  if (!open.length) return undefined;
  // Steer towards the word lengths the player has done least with.
  const counts = countsByLength(puzzle.words, found);
  const progress = (w: string) => {
    const c = counts.get(w.length)!;
    return c.found / c.total;
  };
  const least = Math.min(...open.map(progress));
  const pool = open.filter((w) => progress(w) === least);
  return pool[turn % pool.length];
}

export function newHint(puzzle: Puzzle, foundList: string[], state: HintState): HintState {
  const found = new Set(foundList);
  const cards = liveCards(state, found);
  const target = pickTarget(puzzle, found, new Set(cards.map((c) => c.target)), state.used);
  if (!target) return { ...state, cards };
  return { cards: [...cards, { target, level: 0 }], used: state.used + 1 };
}

export function moreHelp(state: HintState, target: string): HintState {
  return {
    ...state,
    cards: state.cards.map((c) => (c.target === target ? { ...c, level: Math.min(MAX_LEVEL, c.level + 1) } : c)),
  };
}

export function hintText(card: HintCard): string {
  const { target, level } = card;
  const base = `A ${target.length}-letter word`;
  return level === 0 ? `${base} starting with ${target[0]}.` : `${base}: ${mask(target)}`;
}

/** Words found and total per word length, for the hints grid. */
export function countsByLength(words: string[], found: Set<string>): Map<number, { found: number; total: number }> {
  const counts = new Map<number, { found: number; total: number }>();
  for (const w of words) {
    const c = counts.get(w.length) ?? { found: 0, total: 0 };
    c.total++;
    if (found.has(w)) c.found++;
    counts.set(w.length, c);
  }
  return new Map([...counts].sort(([a], [b]) => a - b));
}
