# Verbil

A daily synonym game. Each day has a starter word, mostly verbs with some adjectives and
abstract nouns, and the one meaning it's being used in (RUN, as in "move fast on foot");
players type single-word synonyms, and for verbs kinds of that action too (SPRINT, JOG,
TROT, GALLOP…). Every word speeds up the gerbil's wheel. 80% is
_Gerbrilliant!_; 100% is the _Gerbil Smashdown_.

Hints show a Spelling Bee-style grid of words found and left by length, plus one hint at
a time that points at a word and can be made more specific. Found words are listed A–Z,
beside the game on wide screens and in a sheet on phones.

## Stack

- **Frontend:** Vite + Preact + TypeScript. The gerbil is an inline SVG animated from one
  `requestAnimationFrame` loop, with a canvas overlay for confetti and sparkles. Custom
  on-screen keyboard (no `<input>`, so phones never open their own keyboard).
- **Server:** a [Hono](https://hono.dev) app on Cloudflare Workers, which also serves the static client.
- **Storage:** `localStorage` (`verbil:v1:<date>`), so there are no accounts. Stats show inline in the puzzle list.
  `verbil:version` records the storage version (`STORAGE_VERSION` in `game/storage.ts`); when it's missing or
  older, everything saved is cleared on load except the animation setting. Bump it whenever saved progress
  would no longer match the puzzles.
- **Offline:** a small service worker (`public/sw.js`) caches the app shell, the self-hosted
  Nunito font and every puzzle you open, so once a day has loaded it plays with no network.

## Development

```sh
npm install
npm run dev        # Vite + the Worker on http://localhost:5173
npm test           # Vitest: API date gating, word matching, hints, data checks
npm run typecheck
npm run lint       # oxlint
npm run format     # oxfmt (npm run format:check to verify); includes puzzles.json
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
a starter (a verb unless marked `adjective` or `noun`), the definition of the one sense the
puzzle is about, and its answers:

```
RUN
  move fast on foot: SPRINT JOG DASH TROT CANTER GALLOP ...
    (answers can carry on over further indented lines)
HAPPY adjective
  feeling or showing pleasure: GLAD CHEERFUL JOLLY ...
```

The definition is shown under the verb, so it must not contain any answer. `A/B` accepts
B as an alternative spelling (or, for nouns, BUCKS/BUCK a singular). Answers are synonyms,
plus for verbs specific kinds of the action (so RUN takes TROT and GALLOP): 16–45 per
puzzle and 20+ wherever the sense allows, with slightly less common words where they
clearly fit. Nouns are abstract or general (NONSENSE, MONEY, FOOL), never "kinds of" lists
that turn into trivia. A starter can return with a different sense (RUN as in "manage").
Players can type any form: JOGGING, HAPPIER, IDIOTS. Lists were drafted from Princeton WordNet, cross-checked against a
thesaurus and curated by hand. No two puzzles within a week share more than a quarter of
their answers. Real words WordNet 3.0 lacks (TEXT, WHINGE, DOSH…) go in the `EXTRA_*` sets
in `build.py`; participles count as adjectives (FREEZING, CRAMMED). Day one is fixed and the
rest were shuffled so that puzzles sharing a quarter of their answers are a week apart,
close neighbours two months apart, a returning starter four months apart, and no more than
two adjective/noun days run together.

```sh
python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python -c "import nltk; nltk.download('wordnet')"

.venv/bin/python scripts/build.py      # validate + write src/worker/puzzles.json (npm run puzzles also formats it)
.venv/bin/python scripts/check.py RUN  # sense check: answers WordNet can't link to the starter
.venv/bin/python scripts/draft.py fold --thesaurus  # candidate answers for each sense of a verb
```

`build.py` warns about non-verbs, inflected forms, very rare words, words containing the
starter, definitions that give away an answer, and lists outside 16–45 answers. It also adds irregular forms (RAN→RUN), so the game
accepts any inflection. Once a day has been played, don't edit or reorder past days.
