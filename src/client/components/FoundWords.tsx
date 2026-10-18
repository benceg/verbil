import { Sheet } from "./Sheet";

interface Props {
  found: string[];
  answers: string[];
  revealed: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function FoundWords({ found, answers, revealed, open, onOpen, onClose }: Props) {
  const recent = [...found].reverse().slice(0, 6);
  const foundSet = new Set(found);
  const list = revealed ? [...answers].sort() : [...found].sort();
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
          {list.length ? (
            <ul class="word-list">
              {list.map((w) => (
                <li class={revealed && !foundSet.has(w) ? "missed" : ""}>{w}</li>
              ))}
            </ul>
          ) : (
            <p class="muted">Nothing yet. Type a synonym and press Enter.</p>
          )}
        </Sheet>
      )}
    </>
  );
}
