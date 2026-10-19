import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Puzzle } from "../../shared/types";
import { type HintState, hintText, liveCards, MAX_LEVEL } from "../game/hints";

interface Props {
  puzzle: Puzzle;
  found: string[];
  hints: HintState;
  onNewHint: () => void;
  onMoreHelp: (target: string) => void;
  /** Buttons that share the row with the hint buttons (Stats before, Share after). */
  before?: ComponentChildren;
  after?: ComponentChildren;
}

/** The current hint on one line just above the keyboard, with its buttons in the row beneath. */
export function HintBar({ puzzle, found, hints, onNewHint, onMoreHelp, before, after }: Props) {
  const foundSet = new Set(found);
  const cards = liveCards(hints, foundSet);
  const [index, setIndex] = useState(cards.length - 1);

  // Jump to a newly added hint; stay in range when one drops away.
  const count = cards.length;
  useEffect(() => setIndex(count - 1), [hints.used]);
  const current = Math.min(Math.max(index, 0), count - 1);
  const card = cards[current];

  // Every word left already has a hint pointing at it.
  const taken = new Set(cards.map((c) => c.target));
  const outOfHints = !puzzle.words.some((w) => !foundSet.has(w) && !taken.has(w));

  return (
    <>
      {card && (
        <div class="hint-line">
          {count > 1 && (
            <button
              type="button"
              class="icon-btn"
              onClick={() => setIndex(current - 1)}
              disabled={current <= 0}
              aria-label="Previous hint"
            >
              ‹
            </button>
          )}
          <p class="hint-text" aria-live="polite">
            {hintText(card)}
          </p>
          {count > 1 && (
            <button
              type="button"
              class="icon-btn"
              onClick={() => setIndex(current + 1)}
              disabled={current >= count - 1}
              aria-label={`Next hint (${current + 1} of ${count})`}
            >
              ›
            </button>
          )}
        </div>
      )}
      <div class="action-row">
        {before}
        {card && card.level < MAX_LEVEL && (
          <button type="button" class="btn small" onClick={() => onMoreHelp(card.target)}>
            More help
          </button>
        )}
        <button type="button" class="btn small" onClick={onNewHint} disabled={outOfHints}>
          {outOfHints ? "Out of hints" : count ? "Another hint" : "💡 Hint"}
        </button>
        {after}
      </div>
    </>
  );
}
