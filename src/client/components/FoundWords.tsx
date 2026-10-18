import type { Puzzle } from "../../shared/types";
import { Sheet } from "./Sheet";

export type ListMode = "alpha" | "sense";

interface ListProps {
  puzzle: Puzzle | null;
  found: string[];
  revealed: boolean;
  mode: ListMode;
  onMode: (mode: ListMode) => void;
}

/** The discovered words, alphabetically or grouped under the senses they belong to. */
export function FoundList({ puzzle, found, revealed, mode, onMode }: ListProps) {
  const foundSet = new Set(found);
  const show = (words: string[]) => [...new Set(words)].filter((w) => revealed || foundSet.has(w)).sort();
  const item = (w: string) => <li class={revealed && !foundSet.has(w) ? "missed" : ""}>{w}</li>;
  const all = puzzle ? show(puzzle.senses.flatMap((s) => s.words)) : [];

  return (
    <div class="found-list">
      <div class="seg" role="group" aria-label="Sort words">
        <button type="button" class={mode === "alpha" ? "on" : ""} onClick={() => onMode("alpha")}>
          A–Z
        </button>
        <button type="button" class={mode === "sense" ? "on" : ""} onClick={() => onMode("sense")}>
          By sense
        </button>
      </div>
      {!all.length ? (
        <p class="muted small">Nothing yet. Type a synonym and press Enter.</p>
      ) : mode === "alpha" ? (
        <ul class="word-list">{all.map(item)}</ul>
      ) : (
        puzzle!.senses.map((s) => {
          const words = show(s.words);
          return words.length ? (
            <section class="sense-group">
              <h4>{s.label}</h4>
              <ul class="word-list">{words.map(item)}</ul>
            </section>
          ) : null;
        })
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
