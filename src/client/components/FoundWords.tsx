import type { Puzzle } from "../../shared/types";
import { Sheet } from "./Sheet";

interface ListProps {
  puzzle: Puzzle | null;
  found: string[];
  revealed: boolean;
}

/** The discovered words (or, once revealed, all of them), alphabetically. */
export function FoundList({ puzzle, found, revealed }: ListProps) {
  const foundSet = new Set(found);
  const words = (revealed && puzzle ? puzzle.words : found).slice().sort();
  return (
    <div class="found-list">
      {words.length ? (
        <ul class="word-list">
          {words.map((w) => (
            <li class={revealed && !foundSet.has(w) ? "missed" : ""}>{w}</li>
          ))}
        </ul>
      ) : (
        <p class="muted small">Nothing yet. Type a synonym and press Enter.</p>
      )}
    </div>
  );
}

interface Props extends ListProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/** Mobile: a summary bar that opens the list in a sheet. (On wide screens the list sits beside the game.) */
export function FoundWords({ open, onOpen, onClose, ...list }: Props) {
  const { found, revealed } = list;
  const recent = [...found].reverse().slice(0, 6);
  return (
    <>
      <button type="button" class="found-bar" onClick={onOpen}>
        <span class="found-count">
          {found.length} {found.length === 1 ? "word" : "words"}
        </span>
        <span class="found-recent">{recent.length ? recent.join(" · ") : "Your words will appear here"}</span>
        <span class="found-more">▾</span>
      </button>
      {open && (
        <Sheet title={revealed ? "All the words" : `${found.length} words found`} onClose={onClose}>
          <FoundList {...list} />
        </Sheet>
      )}
    </>
  );
}
