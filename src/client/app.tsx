import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { addDays, formatDate, isDate, LAUNCH, localToday } from "../shared/dates";
import { answersOf } from "../shared/puzzle";
import type { ArchiveEntry, Puzzle } from "../shared/types";
import { fetchArchive, fetchPuzzle, NotAvailable } from "./api";
import { Archive } from "./components/Archive";
import { FoundList, FoundWords, type ListMode } from "./components/FoundWords";
import { Gerbil } from "./components/Gerbil";
import { Help } from "./components/Help";
import { Hints } from "./components/Hints";
import { Keyboard } from "./components/Keyboard";
import { knownSenses, moreHelp, newHint } from "./game/hints";
import { judge } from "./game/lemma";
import { GERBRILLIANT, percent, tierFor } from "./game/scoring";
import { allProgress, loadProgress, type Progress, saveProgress, streak } from "./game/storage";

type Panel = "found" | "hints" | "archive" | "help" | null;
type ToastKind = "good" | "bad" | "info" | "big";

const MAX_LETTERS = 15;
const SEEN_HELP = "verbil:v1:seen-help";
const LIST_MODE = "verbil:v1:list-mode";

function savedListMode(): ListMode {
  try {
    return localStorage.getItem(LIST_MODE) === "sense" ? "sense" : "alpha";
  } catch {
    return "alpha";
  }
}

function dateFromUrl(today: string): string {
  const d = new URLSearchParams(location.search).get("date");
  return d && isDate(d) && d >= LAUNCH && d <= today ? d : today;
}

function firstVisit(): boolean {
  try {
    if (localStorage.getItem(SEEN_HELP)) return false;
    localStorage.setItem(SEEN_HELP, "1");
  } catch {
    // ignore
  }
  return true;
}

export function App() {
  const today = localToday();
  const [date, setDate] = useState(() => dateFromUrl(today));
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>(() => loadProgress(date));
  const [entry, setEntry] = useState("");
  const [toast, setToast] = useState<{ text: string; kind: ToastKind; id: number } | null>(null);
  const [shake, setShake] = useState(0);
  const [panel, setPanel] = useState<Panel>(() => (firstVisit() ? "help" : null));
  const [archive, setArchive] = useState<ArchiveEntry[] | null>(null);
  const [brilliantKey, setBrilliantKey] = useState(0);
  const [smashKey, setSmashKey] = useState(0);
  const [listMode, setListMode] = useState<ListMode>(savedListMode);
  const changeListMode = (mode: ListMode) => {
    setListMode(mode);
    try {
      localStorage.setItem(LIST_MODE, mode);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let live = true;
    setPuzzle(null);
    setError(null);
    setEntry("");
    setProgress(loadProgress(date));
    fetchPuzzle(date)
      .then((p) => live && setPuzzle(p))
      .catch((e) => {
        if (!live) return;
        setError(
          e instanceof NotAvailable
            ? "That puzzle isn't available. Come back when it's that day!"
            : navigator.onLine
              ? String(e.message)
              : "You're offline, and this puzzle hasn't been downloaded yet. Any day you've opened before will still work.",
        );
      });
    return () => {
      live = false;
    };
  }, [date]);

  useEffect(() => {
    const onPop = () => setDate(dateFromUrl(localToday()));
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  // Fetched up front (and refreshed when opened) so the service worker has a copy for offline use.
  const [archiveFailed, setArchiveFailed] = useState(false);
  useEffect(() => {
    if (panel && panel !== "archive") return;
    fetchArchive()
      .then((list) => {
        setArchive(list);
        setArchiveFailed(false);
      })
      .catch(() => setArchiveFailed(true));
  }, [panel]);

  const go = (d: string) => {
    if (d < LAUNCH || d > today) return;
    history.pushState(null, "", d === today ? "/" : `/?date=${d}`);
    setDate(d);
    setPanel(null);
  };

  const answers = useMemo(() => (puzzle ? answersOf(puzzle) : []), [puzzle]);
  const answerSet = useMemo(() => new Set(answers), [answers]);
  const total = answers.length;
  const found = progress.found;
  const pct = percent(found.length, total);
  const complete = total > 0 && found.length >= total;
  const tier = tierFor(found.length, total);
  const locked = !puzzle || complete || !!progress.revealed;

  const update = (next: Progress) => {
    setProgress(next);
    saveProgress(date, next);
  };

  const flash = (text: string, kind: ToastKind) => setToast({ text, kind, id: Date.now() });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.kind === "big" ? 2800 : 1600);
    return () => clearTimeout(t);
  }, [toast]);

  const reject = (text: string, kind: ToastKind = "bad") => {
    flash(text, kind);
    setShake((s) => s + 1);
    navigator.vibrate?.(30);
  };

  const submit = () => {
    if (locked || !puzzle) return;
    const typed = entry;
    if (!typed) return;
    if (typed.length < 3) return reject("Too short");
    setEntry("");
    const verdict = judge(typed, puzzle, answerSet);
    if (verdict.kind === "starter") return reject("That's today's word!");
    if (verdict.kind === "unknown") return reject("Not in the burrow");
    const word = verdict.word;
    if (found.includes(word)) return reject(typed === word ? `Already found ${word}` : `Already found ${word} (${typed})`, "info");

    const next = { ...progress, found: [...found, word], startedOn: progress.startedOn ?? today };
    update(next);
    navigator.vibrate?.([10, 40, 10]);
    const after = percent(next.found.length, total);
    if (after === 100) {
      setSmashKey((k) => k + 1);
      flash("GERBIL SMASHDOWN!", "big");
    } else if (pct < GERBRILLIANT && after >= GERBRILLIANT) {
      setBrilliantKey((k) => k + 1);
      flash("Gerbrilliant!", "big");
    } else {
      flash(typed === word ? `✓ ${word}` : `✓ ${typed} → ${word}`, "good");
    }
  };

  const onKey = (key: string) => {
    if (key === "Enter") submit();
    else if (key === "Backspace") setEntry((e) => e.slice(0, -1));
    else if (/^[A-Z]$/.test(key) && !locked) setEntry((e) => (e.length < MAX_LETTERS ? e + key : e));
  };

  // The physical keyboard drives the same handler; a ref keeps the listener stable.
  const keyRef = useRef(onKey);
  keyRef.current = onKey;
  const panelRef = useRef(panel);
  panelRef.current = panel;
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") return setPanel(null);
      if (panelRef.current) return;
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (key === "Enter" || key === "Backspace" || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        keyRef.current(key);
      }
    };
    addEventListener("keydown", onDown);
    return () => removeEventListener("keydown", onDown);
  }, []);

  const askHint = () => puzzle && update({ ...progress, hints: newHint(puzzle, found, progress.hints) });
  const askMore = (target: string) => update({ ...progress, hints: moreHelp(progress.hints, target) });
  const reveal = () => {
    if (confirm("Reveal all the answers for this day? You can't take it back.")) {
      update({ ...progress, revealed: true });
      setPanel("found");
    }
  };

  const everything = panel === "archive" ? allProgress() : {};
  const sensesKnown = puzzle ? knownSenses(puzzle, new Set(found), progress.hints).size : 0;
  const prev = addDays(date, -1);
  const next = addDays(date, 1);

  const closePanel = useCallback(() => setPanel(null), []);

  return (
    <div class="shell">
      <div class="app">
        <header class="top">
          <button type="button" class="icon-btn" onClick={() => go(prev)} disabled={prev < LAUNCH} aria-label="Previous day">
            ‹
          </button>
          <div class="title">
            <h1>Verbil</h1>
            <span class="subtitle">
              {puzzle ? `#${puzzle.number} · ` : ""}
              {date === today ? "Today" : formatDate(date)}
            </span>
          </div>
          <button type="button" class="icon-btn" onClick={() => go(next)} disabled={next > today} aria-label="Next day">
            ›
          </button>
          <div class="top-actions">
            <button type="button" class="icon-btn" onClick={() => setPanel("archive")} aria-label="All puzzles">
              ☰
            </button>
            <button type="button" class="icon-btn" onClick={() => setPanel("help")} aria-label="How to play">
              ?
            </button>
          </div>
        </header>

        <section class="puzzle-head">
          {error ? (
            <p class="error">{error}</p>
          ) : (
            <>
              <div class="verb">{puzzle?.verb ?? "…"}</div>
              <div class="score">
                <span class={`tier tier-${tier.min}`}>{progress.revealed ? "Revealed" : tier.label}</span>
                <span class="count">
                  {found.length}/{total || "?"} · {pct}%
                </span>
              </div>
              <div class="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div class="progress-fill" style={{ width: `${pct}%` }} />
                <div class="progress-mark" style={{ left: `${GERBRILLIANT}%` }} title="Gerbrilliant" />
              </div>
            </>
          )}
        </section>

        <Gerbil key={date} pct={pct} finished={complete} brilliantKey={brilliantKey} smashKey={smashKey} />

        <div class="entry-wrap">
          {toast && (
            <div key={toast.id} class={`toast toast-${toast.kind}`} role="status">
              {toast.text}
            </div>
          )}
          <div key={shake} class={`entry ${shake ? "shake" : ""}`} aria-live="polite">
            {progress.revealed ? (
              <span class="entry-note">Answers revealed</span>
            ) : complete ? (
              <span class="entry-note">Every word found!</span>
            ) : (
              <>
                <span class="entry-text">{entry}</span>
                <span class="caret" />
              </>
            )}
          </div>
        </div>

        <FoundWords
          puzzle={puzzle}
          found={found}
          revealed={!!progress.revealed}
          mode={listMode}
          onMode={changeListMode}
          open={panel === "found"}
          onOpen={() => setPanel("found")}
          onClose={closePanel}
        />

        <div class="action-row">
          <button type="button" class="btn small" onClick={() => setPanel("hints")} disabled={!puzzle}>
            💡 Hints · senses {sensesKnown}/{puzzle?.senses.length ?? "?"}
          </button>
        </div>

        <Keyboard onKey={onKey} disabled={locked} />

        {panel === "hints" && puzzle && (
          <Hints
            puzzle={puzzle}
            found={found}
            hints={progress.hints}
            complete={complete || !!progress.revealed}
            canReveal={date < today && !complete && !progress.revealed}
            onNewHint={askHint}
            onMoreHelp={askMore}
            onReveal={reveal}
            onClose={closePanel}
          />
        )}
        {panel === "archive" && (
          <Archive
            entries={archive}
          failed={archiveFailed}
            progress={everything}
            today={today}
            current={date}
            streak={streak(today, everything)}
            onPick={go}
            onClose={closePanel}
          />
        )}
        {panel === "help" && <Help onClose={closePanel} />}
      </div>
      <aside class="side" aria-label="Words found">
        <h2>
          {progress.revealed ? "All the words" : `${found.length} ${found.length === 1 ? "word" : "words"} found`}
        </h2>
        <FoundList puzzle={puzzle} found={found} revealed={!!progress.revealed} mode={listMode} onMode={changeListMode} />
      </aside>
    </div>
  );
}
