import { Hono } from "hono";
import { isDate, latestPlayableDate } from "../shared/dates";
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
    .map((p) => ({
      number: p.number,
      date: p.date,
      starter: p.starter,
      definition: p.definition,
      total: p.words.length,
    }))
    .reverse();
  c.header("Cache-Control", "public, max-age=300");
  return c.json(entries);
});

app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

// Everything else: the game page (/, /?date=...) and static files, or a real 404 so
// search engines don't index junk URLs as copies of the home page.
app.all("*", async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw);
  return res.status === 404 ? c.html(NOT_FOUND, 404) : res;
});

const NOT_FOUND = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Page not found · Verbil</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <style>
      body { margin: 0; min-height: 100dvh; display: grid; place-items: center; font-family: system-ui, sans-serif;
        background: #fff4e6; color: #4a3426; text-align: center; padding: 24px; }
      h1 { margin: 0 0 8px; font-size: 1.6rem; }
      a { color: #b8621f; font-weight: 700; }
      @media (prefers-color-scheme: dark) { body { background: #1e1612; color: #f6e8d8; } a { color: #f2a65a; } }
    </style>
  </head>
  <body>
    <main>
      <h1>This page has scurried off</h1>
      <p><a href="/">Play today's Verbil</a></p>
    </main>
  </body>
</html>`;

export default app;
