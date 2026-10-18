import { useEffect, useState } from "preact/hooks";
import type { Puzzle } from "../../shared/types";
import { type HintState, hintText, knownSenses, liveCards, MAX_LEVEL, countsByLength } from "../game/hints";
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
  const known = knownSenses(puzzle, foundSet, hints);
  const cards = liveCards(hints, foundSet);
  const [index, setIndex] = useState(cards.length - 1);

  // Jump to a newly added hint; stay in range when one drops away.
  const count = cards.length;
  useEffect(() => setIndex(count - 1), [hints.used]);
  const current = Math.min(Math.max(index, 0), count - 1);
  const card = cards[current];

  const lengths = [...new Set(puzzle.senses.flatMap((s) => s.words.map((w) => w.length)))].sort((a, b) => a - b);
  let mystery = 0;

  return (
    <Sheet title="Hints" onClose={onClose}>
      <h3 class="senses-title">
        Senses: {known.size} of {puzzle.senses.length} discovered
      </h3>
      <p class="muted small">Words found in each sense, by length.</p>
      <div class="sense-grid" role="table" style={{ "--cols": lengths.length }}>
        <div class="sg-row sg-header" role="row">
          <span role="columnheader" />
          {lengths.map((n) => (
            <span class="sg-len" role="columnheader">
              {n}
            </span>
          ))}
          <span class="sg-total" role="columnheader">
            Σ
          </span>
        </div>
        {puzzle.senses.map((s) => {
          const counts = countsByLength(s, foundSet);
          const done = s.words.filter((w) => foundSet.has(w)).length;
          const isKnown = known.has(s.label);
          return (
            <div class={`sg-row ${done === s.words.length ? "sg-done" : ""}`} role="row">
              <span class={`sg-label ${isKnown ? "" : "sg-mystery"}`} role="rowheader">
                {isKnown ? s.label : `Undiscovered meaning #${++mystery}`}
              </span>
              {lengths.map((n) => {
                const c = counts.get(n);
                if (!c) return <span class="sg-cell sg-empty" role="cell" />;
                const state = c.found === c.total ? "full" : c.found ? "some" : "none";
                return (
                  <span class={`sg-cell sg-${state}`} role="cell" aria-label={`${n} letters: ${c.found} of ${c.total}`}>
                    {c.found}/{c.total}
                  </span>
                );
              })}
              <span class="sg-total" role="cell">
                {done}/{s.words.length}
              </span>
            </div>
          );
        })}
      </div>

      <div class="hint-card">
        {card ? (
          <>
            <div class="hint-nav">
              <button type="button" class="icon-btn" onClick={() => setIndex(current - 1)} disabled={current <= 0} aria-label="Previous hint">
                ‹
              </button>
              <p class="hint-text" aria-live="polite">
                {hintText(puzzle, card)}
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
        <button type="button" class="btn primary" onClick={onNewHint} disabled={complete}>
          {count ? "Another hint" : "Give me a hint"}
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
