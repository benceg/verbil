import type { ComponentChildren } from "preact";

interface Props {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}

export function Sheet({ title, onClose, children }: Props) {
  return (
    <div class="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section class="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header class="sheet-head">
          <h2>{title}</h2>
          <button type="button" class="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div class="sheet-body">{children}</div>
      </section>
    </div>
  );
}
