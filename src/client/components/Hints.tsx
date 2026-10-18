import { useEffect, useState } from "preact/hooks";
import type { Puzzle } from "../../shared/types";
import { countsByLength, type HintState, hintText, liveCards, MAX_LEVEL } from "../game/hints";
import { Sheet } from "./Sheet";

interface Props {
  puzzle: Puzzle;
  found: string[];
  hints: HintState;
  canReveal: boolean;
  complete: boolean;
  onNewHint: () => void;
  onMoreHelp: (target: string) => void;
  onReveal: () => void;
  onClose: () => void;
}

export function Hints({ puzzle, found, hints, canReveal, complete, onNewHint, onMoreHelp, onReveal, onClose }: Props) {
  const foundSet = new Set(found);
  const cards = liveCards(hints, foundSet);
  const [index, setIndex] = useState(cards.length - 1);

  // Jump to a newly added hint; stay in range when one drops away.
  const count = cards.length;
  useEffect(() => setIndex(count - 1), [hints.used]);
  const current = Math.min(Math.max(index, 0), count - 1);
  const card = cards[current];

  const counts = [...countsByLength(puzzle.words, foundSet)];
  // Every word left already has a hint pointing at it.
  const taken = new Set(cards.map((c) => c.target));
  const outOfHints = !puzzle.words.some((w) => !foundSet.has(w) && !taken.has(w));

  return (
    <Sheet title="Hints" onClose={onClose}>
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

      <div class="hint-card">
        {card ? (
          <>
            <div class="hint-nav">
              <button type="button" class="icon-btn" onClick={() => setIndex(current - 1)} disabled={current <= 0} aria-label="Previous hint">
                ‹
              </button>
              <p class="hint-text" aria-live="polite">
                {hintText(card)}
              </p>
              <button
                type="button"
                class="icon-btn"
                onClick={() => setIndex(current + 1)}
                disabled={current >= count - 1}
                aria-label="Next hint"
              >
                ›
              </button>
            </div>
            <div class="hint-meta">
              <span class="muted small">
                Hint {current + 1} of {count}
              </span>
              {card.level < MAX_LEVEL && (
                <button type="button" class="btn small" onClick={() => onMoreHelp(card.target)}>
                  More help
                </button>
              )}
            </div>
          </>
        ) : (
          <p class="muted hint-empty">
            {complete ? "Nothing left to find!" : "Stuck? Ask for a hint and it'll point you at a word."}
          </p>
        )}
      </div>

      <div class="sheet-actions">
        <button type="button" class="btn primary" onClick={onNewHint} disabled={complete || outOfHints}>
          {outOfHints && !complete ? "Out of hints" : count ? "Another hint" : "Give me a hint"}
        </button>
        {canReveal && (
          <button type="button" class="btn" onClick={onReveal}>
            Reveal answers
          </button>
        )}
      </div>
    </Sheet>
  );
}
