import { addDays } from "../../shared/dates";
import { emptyHints, type HintState } from "./hints";

export interface Progress {
  found: string[];
  hints: HintState;
  /** Local date the puzzle was first played, for streaks. */
  startedOn?: string;
  revealed?: boolean;
}

const PREFIX = "verbil:v1:";

/**
 * Version of everything Verbil keeps in localStorage. Bump it when saved data stops
 * matching the puzzles (2: puzzles became single-sense, so old word lists and hints
 * no longer apply). An older or missing version clears all saved data except the
 * keys in `keep` (player settings worth carrying over).
 */
export const STORAGE_VERSION = 2;
const VERSION_KEY = "verbil:version";

export function checkStorageVersion(keep: string[] = []): void {
  try {
    if (Number(localStorage.getItem(VERSION_KEY)) >= STORAGE_VERSION) return;
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("verbil:") && !keep.includes(key)) stale.push(key);
    }
    for (const key of stale) localStorage.removeItem(key);
    localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  } catch {
    // Storage unavailable: nothing saved to clear.
  }
}

export const emptyProgress = (): Progress => ({ found: [], hints: emptyHints() });

// Storage can be unavailable (private mode, blocked site data); the game still works, it just forgets.
export function loadProgress(date: string): Progress {
  try {
    const raw = localStorage.getItem(PREFIX + date);
    if (raw) return { ...emptyProgress(), ...JSON.parse(raw) } as Progress;
  } catch {
    // fall through
  }
  return emptyProgress();
}

export function saveProgress(date: string, progress: Progress): void {
  try {
    localStorage.setItem(PREFIX + date, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function allProgress(): Record<string, Progress> {
  const out: Record<string, Progress> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) out[key.slice(PREFIX.length)] = loadProgress(key.slice(PREFIX.length));
    }
  } catch {
    // ignore
  }
  return out;
}

/** Consecutive days, ending today (or yesterday if today isn't started), on which that day's puzzle was played. */
export function streak(today: string, progress: Record<string, Progress>): number {
  const playedOnDay = (d: string) => progress[d]?.startedOn === d && progress[d].found.length > 0;
  let day = playedOnDay(today) ? today : addDays(today, -1);
  let count = 0;
  while (playedOnDay(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}
