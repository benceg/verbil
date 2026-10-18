import { Hono } from "hono";
import { isDate, latestPlayableDate } from "../shared/dates";
import { answersOf } from "../shared/puzzle";
import type { ArchiveEntry, Puzzle } from "../shared/types";
import data from "./puzzles.json";

const puzzles = data as unknown as Puzzle[];
const byDate = new Map(puzzles.map((p) => [p.date, p]));

const app = new Hono();

// Nothing dated after today (in the earliest timezone) is ever served, so tomorrow's
// words can't be fetched early. The answers aren't in the client bundle either.
app.get("/api/puzzle/:date", (c) => {
  const date = c.req.param("date");
  const puzzle = isDate(date) && date <= latestPlayableDate() ? byDate.get(date) : undefined;
  if (!puzzle) return c.json({ error: "No puzzle for that date" }, 404);
  c.header("Cache-Control", "public, max-age=300");
  return c.json(puzzle);
});

app.get("/api/archive", (c) => {
  const latest = latestPlayableDate();
  const entries: ArchiveEntry[] = puzzles
    .filter((p) => p.date <= latest)
    .map((p) => ({ number: p.number, date: p.date, verb: p.verb, total: answersOf(p).length }))
    .reverse();
  c.header("Cache-Control", "public, max-age=300");
  return c.json(entries);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
