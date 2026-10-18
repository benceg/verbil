import type { ArchiveEntry, Puzzle } from "../shared/types";

export class NotAvailable extends Error {}

export async function fetchPuzzle(date: string): Promise<Puzzle> {
  const res = await fetch(`/api/puzzle/${date}`);
  if (res.status === 404) throw new NotAvailable(date);
  if (!res.ok) throw new Error(`Couldn't load the puzzle (${res.status})`);
  return res.json();
}

export async function fetchArchive(): Promise<ArchiveEntry[]> {
  const res = await fetch("/api/archive");
  if (!res.ok) throw new Error(`Couldn't load the archive (${res.status})`);
  return res.json();
}
