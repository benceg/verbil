import { percent } from "./scoring";

const CHEESE = "🧀";

/**
 * The text shared from the game (sharing opens at Gerbrilliant), linking to that day's puzzle, e.g.
 *
 *   🐭 Verbil #24 (https://verbil.fun/?date=2026-11-10)
 *   Gerbrilliant! 🧀🧀🧀🧀
 *   27/33 words - 81%
 *
 * A Smashdown (every word) gets five cheeses.
 */
export function shareText(number: number, date: string, found: number, total: number): string {
  const pct = percent(found, total);
  const rank = pct >= 100 ? `Smashdown! ${CHEESE.repeat(5)}` : `Gerbrilliant! ${CHEESE.repeat(4)}`;
  return `🐭 Verbil #${number} (https://verbil.fun/?date=${date})\n${rank}\n${found}/${total} words - ${pct}%`;
}
