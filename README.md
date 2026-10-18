# Verbil

A daily verb-synonym game. Each day has a starter verb (RUN); players type single-word
synonyms from **any** of its senses (SPRINT, MANAGE, FLOW…). Every word speeds up the
gerbil's wheel. 80% is *Gerbrilliant!*; 100% is the *Gerbil Smashdown*.

## Stack

- **Frontend:** Vite + Preact + TypeScript. The gerbil is an inline SVG animated from one
  `requestAnimationFrame` loop, with a canvas overlay for confetti and sparkles. Custom
  on-screen keyboard (no `<input>`, so phones never open their own keyboard).
- **Server:** a [Hono](https://hono.dev) app on Cloudflare Workers, which also serves the static client.
- **Storage:** `localStorage` (`verbil:v1:<date>`), so there are no accounts. Stats show inline in the puzzle list.

## Development

```sh
npm install
npm run dev        # Vite + the Worker on http://localhost:5173
npm test           # Vitest: API date gating, word matching, hints, data checks
npm run typecheck
```

## Deploying (free)

Cloudflare Workers' free plan (100k requests/day) covers this comfortably.

```sh
npx wrangler login
npm run deploy     # builds, then `wrangler deploy` -> https://verbil.<you>.workers.dev
```

A custom domain can be attached in the Cloudflare dashboard.

## No peeking at tomorrow

The answers aren't in the client bundle. `GET /api/puzzle/:date` only returns a puzzle whose
date has begun in **UTC+14**, the earliest timezone, so everyone gets their new puzzle at
local midnight. The client never shows or navigates to a date after the player's local
today. (Someone determined could call the API by hand during the hours when it's already
"tomorrow" in Kiribati. Without accounts, any scheme has to trust the clock at one end, and
this one is the friendliest.)

## Puzzle data

Puzzles live in [`data/puzzles.txt`](data/puzzles.txt): one block per day from 2026-10-18,
a starter verb with one line per sense:

```
RUN
  move fast: SPRINT JOG DASH ...
  manage: MANAGE OPERATE DIRECT ...
```

`A/B` accepts B as an alternative spelling. Lists were drafted from Princeton WordNet and
curated by hand: mostly common words, the odd rarity, at least 24 answers each.

```sh
python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python -c "import nltk; nltk.download('wordnet')"

.venv/bin/python scripts/build.py      # validate + write src/worker/puzzles.json (npm run puzzles)
.venv/bin/python scripts/check.py RUN  # sense check: answers WordNet can't link to the starter
.venv/bin/python scripts/draft.py fold # draft a new puzzle block from WordNet
```

`build.py` warns about non-verbs, inflected forms, very rare words, words containing the
starter, and lists under 24 answers. It also adds irregular forms (RAN→RUN), so the game
accepts any inflection. Once a day has been played, don't edit or reorder past days.
