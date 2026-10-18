import { Hono } from "hono";
import { isDate, latestPlayableDate } from "../shared/dates";
import { answersOf } from "../shared/puzzle";
import type { ArchiveEntry, Puzzle } from "../shared/types";
import data from "./puzzles.json";

const puzzles = data as unknown as Puzzle[];
const byDate = new Map(puzzles.map((p) => [p.date, p]));

const app = new Hono<{ Bindings: { ASSETS: Fetcher } }>();

// The deployed site. Anything else (localhost, a LAN address for testing on a phone) is
// left alone, so local development keeps working over plain http.
const PRODUCTION = /(^|\.)verbil\.fun$|\.workers\.dev$/;

// On the real site, always use HTTPS and tell browsers to stick to it (HSTS).
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  const production = PRODUCTION.test(url.hostname);
  if (production && url.protocol === "http:") {
    url.protocol = "https:";
    return c.redirect(url.toString(), 301);
  }
  await next();
  if (production) c.header("Strict-Transport-Security", "max-age=31536000");
});

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

app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

// Everything else is the single-page app.
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
