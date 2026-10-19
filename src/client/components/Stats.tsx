import type { Puzzle } from "../../shared/types";
import { countsByLength } from "../game/hints";
import { Sheet } from "./Sheet";

interface Props {
  puzzle: Puzzle;
  found: string[];
  canReveal: boolean;
  onReveal: () => void;
  onClose: () => void;
}

/** Words found so far, by number of letters, and (for past days) a way to give up. */
export function Stats({ puzzle, found, canReveal, onReveal, onClose }: Props) {
  const counts = [...countsByLength(puzzle.words, new Set(found))];
  return (
    <Sheet title="Stats" onClose={onClose}>
      <p class="muted small">Words found, by number of letters.</p>
      <ul class="length-bars">
        {counts.map(([n, c]) => (
          <li class={c.found === c.total ? "lb-done" : ""}>
            <span class="lb-len">{n}</span>
            <span
              class="lb-bar"
              role="progressbar"
              aria-label={`${n}-letter words`}
              aria-valuenow={c.found}
              aria-valuemin={0}
              aria-valuemax={c.total}
            >
              <span class="lb-fill" style={{ width: `${(c.found / c.total) * 100}%` }} />
            </span>
            <span class="lb-count">
              {c.found}/{c.total}
            </span>
          </li>
        ))}
      </ul>
      <p class="lb-summary">
        {found.length} of {puzzle.words.length} words found
      </p>
      {canReveal && (
        <div class="sheet-actions">
          <button type="button" class="btn" onClick={onReveal}>
            Reveal answers
          </button>
        </div>
      )}
    </Sheet>
  );
}
