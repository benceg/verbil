import type { Puzzle, Sense } from "../../shared/types";

/**
 * A hint points at one unfound word. It starts vague (its length and which
 * sense it belongs to) and the player can ask for more: the first letter,
 * then a partly filled-in mask. Hints for words the player has since found
 * simply drop away.
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

export const MAX_LEVEL = 2;

export const emptyHints = (): HintState => ({ cards: [], used: 0 });

export function mask(word: string): string {
  return [...word].map((ch, i) => (i === 0 || i % 3 === 0 ? ch : "_")).join(" ");
}

export function liveCards(state: HintState, found: Set<string>): HintCard[] {
  return state.cards.filter((c) => !found.has(c.target));
}

export function senseOf(puzzle: Puzzle, word: string): Sense {
  return puzzle.senses.find((s) => s.words.includes(word))!;
}

/** Senses the player knows about: they've found a word in it, or a hint has pointed at it. */
export function knownSenses(puzzle: Puzzle, found: Set<string>, state: HintState): Set<string> {
  const known = new Set<string>();
  for (const s of puzzle.senses) if (s.words.some((w) => found.has(w))) known.add(s.label);
  for (const c of liveCards(state, found)) known.add(senseOf(puzzle, c.target).label);
  return known;
}

function pickTarget(puzzle: Puzzle, found: Set<string>, taken: Set<string>, turn: number): string | undefined {
  const open = (s: Sense) => s.words.filter((w) => !found.has(w) && !taken.has(w));
  const candidates = puzzle.senses.filter((s) => open(s).length);
  if (!candidates.length) return undefined;
  // Steer towards the senses the player has done least with.
  const progress = (s: Sense) => s.words.filter((w) => found.has(w)).length / s.words.length;
  const least = Math.min(...candidates.map(progress));
  const pool = candidates.filter((s) => progress(s) === least);
  return open(pool[turn % pool.length])[0];
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

export function hintText(puzzle: Puzzle, card: HintCard): string {
  const { target, level } = card;
  const base = `A ${target.length}-letter word for “${senseOf(puzzle, target).label}”`;
  if (level === 0) return `${base}.`;
  if (level === 1) return `${base}, starting with ${target[0]}.`;
  return `${base}: ${mask(target)}`;
}

/** Words found and total per word length in a sense, for the hints grid. */
export function countsByLength(sense: Sense, found: Set<string>): Map<number, { found: number; total: number }> {
  const counts = new Map<number, { found: number; total: number }>();
  for (const w of sense.words) {
    const c = counts.get(w.length) ?? { found: 0, total: 0 };
    c.total++;
    if (found.has(w)) c.found++;
    counts.set(w.length, c);
  }
  return counts;
}
