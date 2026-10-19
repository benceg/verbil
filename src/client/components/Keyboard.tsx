const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "+ZXCVBNM-"];

interface Props {
  onKey: (key: string) => void;
  disabled?: boolean;
}

/** On-screen keyboard. Keys fire on pointerdown so fast typing feels instant on phones. */
export function Keyboard({ onKey, disabled }: Props) {
  const press = (key: string) => (e: PointerEvent) => {
    e.preventDefault();
    if (disabled) return;
    navigator.vibrate?.(8);
    onKey(key);
  };
  return (
    <div class={`keyboard ${disabled ? "disabled" : ""}`} role="group" aria-label="Keyboard">
      {ROWS.map((row) => (
        <div class="kb-row">
          {[...row].map((ch) => {
            const key = ch === "+" ? "Enter" : ch === "-" ? "Backspace" : ch;
            return (
              <button
                type="button"
                class={`key ${key.length > 1 ? "key-wide" : ""} ${key === "Enter" ? "key-enter" : ""}`}
                onPointerDown={press(key)}
                aria-label={key === "Backspace" ? "Delete" : key}
              >
                {key === "Enter" ? (
                  <svg class="key-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                ) : key === "Backspace" ? (
                  "⌫"
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
