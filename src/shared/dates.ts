export const LAUNCH = "2026-10-18";

/** The furthest-east timezone is UTC+14, so its date is the latest anyone can legitimately have. */
const EARLIEST_ZONE_MS = 14 * 60 * 60 * 1000;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

export function latestPlayableDate(now: Date = new Date()): string {
  return new Date(now.getTime() + EARLIEST_ZONE_MS).toISOString().slice(0, 10);
}

export function localToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
