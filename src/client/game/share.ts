import { percent, tierFor } from "./scoring";

const SEGMENTS = 10;
const FILLED = "🟧";
const EMPTY = "⬜";

/**
 * The text shared from the game, e.g.
 *
 *   Verbil (verbil.fun)
 *   Good 🟧🟧🟧🟧🟧🟧⬜⬜⬜⬜
 *   30/49 words - 61%
 */
export function shareText(found: number, total: number): string {
  const pct = percent(found, total);
  // Any progress shows at least one filled segment; only a full set fills all ten.
  const filled = pct >= 100 ? SEGMENTS : Math.min(SEGMENTS - 1, Math.max(found > 0 ? 1 : 0, Math.floor(pct / 10)));
  const bar = FILLED.repeat(filled) + EMPTY.repeat(SEGMENTS - filled);
  return `Verbil (verbil.fun)\n${tierFor(found, total).label} ${bar}\n${found}/${total} words - ${pct}%`;
}
