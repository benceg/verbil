const ANIMATE = "verbil:v1:animate";
const REDUCED = "(prefers-reduced-motion: reduce)";

/** The player's explicit animation choice, or null to follow the device's reduced-motion setting. */
export function savedAnimate(): boolean | null {
  try {
    const v = localStorage.getItem(ANIMATE);
    return v === "on" ? true : v === "off" ? false : null;
  } catch {
    return null;
  }
}

export function saveAnimate(on: boolean): void {
  try {
    localStorage.setItem(ANIMATE, on ? "on" : "off");
  } catch {
    // ignore
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED).matches;
}

export function onReducedMotionChange(cb: (reduced: boolean) => void): () => void {
  const mq = window.matchMedia(REDUCED);
  const listener = () => cb(mq.matches);
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}
