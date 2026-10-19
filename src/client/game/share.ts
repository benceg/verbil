import { percent } from "./scoring";

const CHEESE = "🧀";

/**
 * The text shared from the game (sharing opens at Gerbrilliant), e.g.
 *
 *   🐭 Verbil (verbil.fun)
 *   Gerbrilliant! 🧀🧀🧀🧀
 *   27/33 words - 81%
 *
 * A Smashdown (every word) gets five cheeses.
 */
export function shareText(found: number, total: number): string {
  const pct = percent(found, total);
  const rank = pct >= 100 ? `Smashdown! ${CHEESE.repeat(5)}` : `Gerbrilliant! ${CHEESE.repeat(4)}`;
  return `🐭 Verbil (verbil.fun)\n${rank}\n${found}/${total} words - ${pct}%`;
}
