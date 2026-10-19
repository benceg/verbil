// Small line icons for the buttons above the keyboard, drawn in the text colour.

/** A lightbulb: for asking for a hint. */
export function BulbIcon() {
  return (
    <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 17.5h6M10 21h4" />
      <path d="M9 15c0-2-3-3.6-3-7.2a6 6 0 0 1 12 0c0 3.6-3 5.2-3 7.2Z" />
    </svg>
  );
}

/** A question mark in a circle: for more help with the current hint. */
export function HelpIcon() {
  return (
    <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.4a2.7 2.7 0 1 1 3.8 2.5c-.8.4-1.2 1-1.2 1.9v.4" />
      <circle cx="12" cy="17.2" r="0.4" class="dot" />
    </svg>
  );
}

/** A horizontal bar chart: for the stats. */
export function StatsIcon() {
  return (
    <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 3.5v17" />
      <path d="M4 7h11M4 12h15M4 17h7" class="bar" />
    </svg>
  );
}
