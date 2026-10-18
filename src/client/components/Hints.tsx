import type { Puzzle } from "../../shared/types";
import type { HintState } from "../game/hints";
import { Sheet } from "./Sheet";

interface Props {
  puzzle: Puzzle;
  found: string[];
  hints: HintState;
  canReveal: boolean;
  complete: boolean;
  onHint: () => void;
  onReveal: () => void;
  onClose: () => void;
}

export function Hints({ puzzle, found, hints, canReveal, complete, onHint, onReveal, onClose }: Props) {
  const foundSet = new Set(found);
  const senses = puzzle.senses.map((s) => ({
    label: s.label,
    found: s.words.filter((w) => foundSet.has(w)).length,
    total: s.words.length,
    hinted: hints.senses.includes(s.label),
  }));
  const touched = senses.filter((s) => s.found > 0).length;
  return (
    <Sheet title="Hints" onClose={onClose}>
      <h3 class="senses-title">
        Senses: {touched} of {senses.length} found
      </h3>
      <p class="muted small">
        {puzzle.verb} has {senses.length} meanings. Words for every one of them count.
      </p>
      <ul class="senses">
        {senses.map((s) =>
          s.found > 0 ? (
            <li class={`sense ${s.found === s.total ? "done" : "found"}`}>
              {s.label}{" "}
              <span>
                {s.found}/{s.total}
              </span>
            </li>
          ) : s.hinted ? (
            <li class="sense hinted">
              {s.label} <span>0/{s.total}</span>
            </li>
          ) : (
            <li class="sense hidden">
              ? <span>0/{s.total}</span>
            </li>
          ),
        )}
      </ul>
      {hints.log.length > 0 && (
        <ol class="hint-log">
          {hints.log.map((h) => (
            <li>{h}</li>
          ))}
        </ol>
      )}
      <div class="sheet-actions">
        <button type="button" class="btn primary" onClick={onHint} disabled={complete}>
          {hints.log.length ? "Another hint" : "Give me a hint"}
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
