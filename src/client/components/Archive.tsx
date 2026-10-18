import { formatDate } from "../../shared/dates";
import type { ArchiveEntry } from "../../shared/types";
import { percent, tierFor } from "../game/scoring";
import type { Progress } from "../game/storage";
import { Sheet } from "./Sheet";

interface Props {
  entries: ArchiveEntry[] | null;
  failed: boolean;
  progress: Record<string, Progress>;
  today: string;
  current: string;
  streak: number;
  onPick: (date: string) => void;
  onClose: () => void;
}

export function Archive({ entries: all, failed, progress, today, current, streak, onPick, onClose }: Props) {
  // The server lists every day that has begun anywhere on Earth; only show the player's own days.
  const entries = all?.filter((e) => e.date <= today) ?? null;
  const finished = entries?.filter((e) => (progress[e.date]?.found.length ?? 0) >= e.total).length ?? 0;
  const played = entries?.filter((e) => (progress[e.date]?.found.length ?? 0) > 0).length ?? 0;
  return (
    <Sheet title="Puzzles" onClose={onClose}>
      <p class="archive-summary">
        <span>🔥 {streak}-day streak</span>
        <span>{played} played</span>
        <span>{finished} smashed</span>
      </p>
      {!entries ? (
        <p class="muted">{failed ? "You're offline. The list will appear when you reconnect." : "Loading…"}</p>
      ) : (
        <ul class="archive">
          {entries.map((e) => {
            const p = progress[e.date];
            const found = p?.found.length ?? 0;
            const tier = tierFor(found, e.total);
            const pct = percent(found, e.total);
            return (
              <li>
                <button
                  type="button"
                  class={`archive-row ${e.date === current ? "current" : ""} tier-${tier.min}`}
                  onClick={() => onPick(e.date)}
                >
                  <span class="archive-num">#{e.number}</span>
                  <span class="archive-date">{e.date === today ? "Today" : formatDate(e.date)}</span>
                  <span class="archive-verb">{e.verb}</span>
                  <span class="archive-status">
                    {p?.revealed ? "Revealed" : tier.label}
                    {found > 0 && pct < 100 ? ` · ${pct}%` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
