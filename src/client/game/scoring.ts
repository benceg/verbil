export interface Tier {
  min: number; // percent found
  label: string;
}

export const TIERS: Tier[] = [
  { min: 0, label: "Parking" },
  { min: 1, label: "Scampering" },
  { min: 25, label: "Scurrying" },
  { min: 50, label: "Cantering" },
  { min: 65, label: "Dashing" },
  { min: 80, label: "Sprinting" },
  { min: 100, label: "Smashdown!" },
];

export const GERBRILLIANT = 80;

export function percent(found: number, total: number): number {
  if (!total || !found) return 0;
  return found >= total ? 100 : Math.max(1, Math.floor((found / total) * 100));
}

export function tierFor(found: number, total: number): Tier {
  const pct = percent(found, total);
  return [...TIERS].reverse().find((t) => pct >= t.min) ?? TIERS[0];
}
