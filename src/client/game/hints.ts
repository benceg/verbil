import type { Puzzle } from "../../shared/types";

type Step = "sense" | "letter" | "ending" | "prefix" | "mask";

export interface HintState {
  target?: string;
  /** Remaining steps for the current target, vaguest first. */
  plan: Step[];
  log: string[];
  /** Sense labels revealed by hints, before the player has found a word for them. */
  senses: string[];
}

export const emptyHints = (): HintState => ({ plan: [], log: [], senses: [] });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function mask(word: string): string {
  return [...word].map((ch, i) => (i === 0 || i % 3 === 0 ? ch : "_")).join(" ");
}

/** Longest ending (3-5 letters) the target shares with a word already found. */
function sharedEnding(target: string, found: string[]): string | undefined {
  for (let n = 5; n >= 3; n--) {
    const end = target.slice(-n);
    if (target.length > n && found.some((w) => w !== target && w.length > n && w.endsWith(end))) return end;
  }
  return undefined;
}

function pickTarget(puzzle: Puzzle, found: Set<string>, turn: number): string | undefined {
  // Prefer senses the player hasn't touched; otherwise rotate through the senses.
  const open = puzzle.senses.filter((s) => s.words.some((w) => !found.has(w)));
  if (!open.length) return undefined;
  const untouched = open.filter((s) => !s.words.some((w) => found.has(w)));
  const pool = untouched.length ? untouched : open;
  const sense = pool[turn % pool.length];
  return sense.words.find((w) => !found.has(w));
}

/**
 * Each hint narrows in on one unfound word, going from vague to specific:
 * an untouched sense, a starting-letter count, a shared ending, the word's
 * length and first two letters, and finally a partly filled-in mask.
 */
export function nextHint(puzzle: Puzzle, foundList: string[], state: HintState): HintState {
  const found = new Set(foundList);
  let { target, plan } = state;
  if (!target || found.has(target) || !plan.length) {
    target = pickTarget(puzzle, found, state.log.length);
    if (!target) return state;
    const sense = puzzle.senses.find((s) => s.words.includes(target!))!;
    const touched = sense.words.some((w) => found.has(w)) || state.senses.includes(sense.label);
    plan = [...(touched ? [] : (["sense"] as Step[])), "letter", "ending", "prefix", "mask"];
  }
  const t = target;
  const ending = sharedEnding(t, foundList);
  // Endings only help if the player has found a word to compare with.
  plan = plan.filter((step) => step !== "ending" || ending);
  const [step, ...rest] = plan;
  const senses = [...state.senses];
  let text: string;

  if (step === "sense") {
    const label = puzzle.senses.find((s) => s.words.includes(t))!.label;
    senses.push(label);
    text = `${puzzle.verb} can also mean “${label}”. Can you think of a word for that?`;
  } else if (step === "letter") {
    const remaining = new Set(puzzle.senses.flatMap((s) => s.words).filter((w) => !found.has(w)));
    const n = [...remaining].filter((w) => w[0] === t[0]).length;
    text = `There ${n === 1 ? "is" : "are"} ${plural(n, "word")} starting with ${t[0]} still to find.`;
  } else if (step === "ending") {
    text = `You've found a word ending in -${ending}. There's another one to find!`;
  } else if (step === "prefix") {
    text = `One of them is ${t.length} letters long and starts with ${t.slice(0, 2)}.`;
  } else {
    text = `Try this one: ${mask(t)}`;
  }
  return { target: t, plan: rest, log: [...state.log, text], senses };
}
