import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { formatDate, isDate, LAUNCH, localToday } from "../shared/dates";
import type { ArchiveEntry, Puzzle } from "../shared/types";
import { fetchArchive, fetchPuzzle, NotAvailable } from "./api";
import { Archive } from "./components/Archive";
import { FoundList, FoundWords } from "./components/FoundWords";
import { Gerbil } from "./components/Gerbil";
import { Help } from "./components/Help";
import { HintBar } from "./components/HintBar";
import { Keyboard } from "./components/Keyboard";
import { Stats } from "./components/Stats";
import { moreHelp, newHint } from "./game/hints";
import { judge } from "./game/lemma";
import { GERBRILLIANT, percent, tierFor } from "./game/scoring";
import { shareText } from "./game/share";
import { allProgress, loadProgress, type Progress, saveProgress, streak } from "./game/storage";
import { onReducedMotionChange, prefersReducedMotion, saveAnimate, savedAnimate } from "./settings";

declare global {
  interface Window {
    verbil?: { smashdown: () => void; gerbrilliant: () => void };
  }
}

type Panel = "found" | "stats" | "archive" | "help" | null;
type ToastKind = "good" | "bad" | "info" | "big";

const MAX_LETTERS = 15;
const SEEN_HELP = "verbil:v1:seen-help";

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

  // Dev only: preview the celebrations from the browser console, without touching saved progress.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.verbil = {
      smashdown: () => setSmashKey((k) => k + 1),
      gerbrilliant: () => setBrilliantKey((k) => k + 1),
    };
    console.info("Verbil dev: verbil.smashdown() or verbil.gerbrilliant() previews the animations.");
    return () => {
      delete window.verbil;
    };
  }, []);

  // Animation follows the device's reduced-motion setting unless the player has chosen.
  const [animatePref, setAnimatePref] = useState(savedAnimate);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  useEffect(() => onReducedMotionChange(setReducedMotion), []);
  const animate = animatePref ?? !reducedMotion;
  useLayoutEffect(() => {
    document.documentElement.dataset.motion = animate ? "on" : "off";
  }, [animate]);
  const toggleAnimate = () => {
    setAnimatePref(!animate);
    saveAnimate(!animate);
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

  const answers = useMemo(() => puzzle?.words ?? [], [puzzle]);
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
    if (found.includes(word))
      return reject(typed === word ? `Already found ${word}` : `Already found ${word} (${typed})`, "info");

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

  // The system share sheet where there is one; otherwise copy the text to the clipboard.
  // Sharing is the reward for reaching Gerbrilliant.
  const canShare = pct >= GERBRILLIANT;
  const share = async () => {
    if (!canShare) return;
    const text = shareText(found.length, total);
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(text);
        flash("Copied to clipboard", "info");
      } catch {
        flash("Couldn't share", "bad");
      }
    };
    if (!navigator.share) return copy();
    try {
      await navigator.share({ text });
    } catch (e) {
      if ((e as Error).name !== "AbortError") await copy();
    }
  };

  const askHint = () => puzzle && update({ ...progress, hints: newHint(puzzle, found, progress.hints) });
  const askMore = (target: string) => update({ ...progress, hints: moreHelp(progress.hints, target) });
  const reveal = () => {
    if (confirm("Reveal all the answers for this day? You can't take it back.")) {
      update({ ...progress, revealed: true });
      setPanel("found");
    }
  };

  const everything = panel === "archive" ? allProgress() : {};

  const closePanel = useCallback(() => setPanel(null), []);

  const statsButton = (
    <button type="button" class="btn small" onClick={() => setPanel("stats")} disabled={!puzzle}>
      📊 Stats
    </button>
  );
  const shareButton = canShare && (
    <button type="button" class="btn small share-btn" onClick={share}>
      <span class="share-label">{complete ? "Smashdown!" : "Gerbrilliant!"}</span> ↗ Share
    </button>
  );

  return (
    <div class="shell">
      <div class="app">
        {/* A button either side keeps the title centred over the verb. */}
        <header class="top">
          <button type="button" class="icon-btn top-help" onClick={() => setPanel("help")} aria-label="How to play">
            ?
          </button>
          <div class="title">
            <h1>Verbil</h1>
            <span class="subtitle">
              {puzzle ? `#${puzzle.number} · ` : ""}
              {date === today ? "Today" : formatDate(date)}
            </span>
          </div>
          <button
            type="button"
            class="icon-btn top-archive"
            onClick={() => setPanel("archive")}
            aria-label="All puzzles"
          >
            ☰
          </button>
        </header>

        <section class="puzzle-head">
          {error ? (
            <p class="error">{error}</p>
          ) : (
            <>
              <div class="verb">{puzzle?.starter ?? "…"}</div>
              <p class="definition">
                {puzzle ? (
                  <>
                    <span class="pos">{puzzle.pos}</span> “{puzzle.definition}”
                  </>
                ) : (
                  "\u00a0"
                )}
              </p>
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

        <Gerbil
          key={date}
          pct={pct}
          finished={complete}
          brilliantKey={brilliantKey}
          smashKey={smashKey}
          animate={animate}
        />

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
          open={panel === "found"}
          onOpen={() => setPanel("found")}
          onClose={closePanel}
        />

        {puzzle && !locked ? (
          <HintBar
            puzzle={puzzle}
            found={found}
            hints={progress.hints}
            onNewHint={askHint}
            onMoreHelp={askMore}
            before={statsButton}
            after={shareButton}
          />
        ) : (
          <div class="action-row">
            {statsButton}
            {shareButton}
          </div>
        )}

        <Keyboard onKey={onKey} disabled={locked} />

        {panel === "stats" && puzzle && (
          <Stats
            puzzle={puzzle}
            found={found}
            canReveal={date < today && !complete && !progress.revealed}
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
        {panel === "help" && <Help animate={animate} onToggleAnimate={toggleAnimate} onClose={closePanel} />}
      </div>
      <aside class="side" aria-label="Words found">
        <h2>
          {progress.revealed ? "All the words" : `${found.length} ${found.length === 1 ? "word" : "words"} found`}
        </h2>
        <FoundList puzzle={puzzle} found={found} revealed={!!progress.revealed} />
      </aside>
    </div>
  );
}
