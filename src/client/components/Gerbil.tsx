import type { RefObject } from "preact";
import { useEffect, useLayoutEffect, useRef } from "preact/hooks";
import { GERBRILLIANT } from "../game/scoring";

type GRef = RefObject<SVGGElement | null>;

/*
 * The gerbil stage: an SVG scene animated from one requestAnimationFrame loop.
 * Elements are mutated through refs every frame rather than re-rendered.
 *
 * - The wheel's speed eases towards a target set by the player's progress.
 * - `brilliantKey` changing plays the Gerbrilliant sparkle (star eyes + burst).
 * - `smashKey` changing plays the Gerbil Smashdown: the wheel shakes loose and
 *   rolls off-screen, then the gerbil hops back, dizzy, and turns to face you
 *   holding a #1 trophy.
 * - `finished` replays the Smashdown whenever a solved day is opened or reloaded.
 * - `animate` false freezes the scene in its resting pose.
 */

interface Props {
  pct: number;
  finished: boolean;
  brilliantKey: number;
  /** Off: everything holds still (the player's setting, which defaults to their reduced-motion preference). */
  animate: boolean;
  smashKey: number;
}

const WHEEL = { x: 200, y: 140, r: 112 };
const MAX_SPEED = 7.5; // radians per second at 100%
const SWEAT_CYCLE = 2.8; // seconds: fade in, fall, fade out, then a pause
const RUNNER_SCALE = 1.12;
// Foot centres (far-back, far-front, near-back, near-front), each overlapping the belly edge.
const FEET = [
  { x: -14, y: -1.5 },
  { x: 36, y: -2.5 },
  { x: -18, y: -1.5 },
  { x: 32, y: -2.5 },
];
const BACK_FOOT = FEET[2];
const FOOT_RY = 4.4;
const BACK_SOLE_Y = BACK_FOOT.y + FOOT_RY;
const TREAD_R = 102.5; // the dark tread line the feet stand on
const RUNNER_Y = 235.25; // puts the back soles on the tread when standing still
const SMASH_SECONDS = 6.5;

interface FigureRefs {
  root: GRef;
  tail: GRef;
  legs: GRef[]; // far-back, far-front, near-back, near-front
  eyes: GRef;
  shades: GRef;
  shadesArm: GRef;
  ear: GRef;
}

function useFigureRefs(): FigureRefs {
  return {
    root: useRef<SVGGElement>(null),
    tail: useRef<SVGGElement>(null),
    legs: [useRef<SVGGElement>(null), useRef<SVGGElement>(null), useRef<SVGGElement>(null), useRef<SVGGElement>(null)],
    eyes: useRef<SVGGElement>(null),
    shades: useRef<SVGGElement>(null),
    shadesArm: useRef<SVGGElement>(null),
    ear: useRef<SVGGElement>(null),
  };
}

const TAIL = "M 0,0 C -18,-4 -30,-18 -33,-42";
// The tail's outline (6.4 = 2 x 3.2) matches the body's 3.2 stroke.
const TAIL_WIDTH = 4.2;

const BODY =
  "M -48,-26 C -48,-40 -40,-48 -20,-54 C 0,-60 14,-66 32,-64 C 50,-62 62,-50 62,-38 C 62,-28 56,-20 46,-16 C 36,-6 20,-4 0,-4 C -10,-4 -16,-4 -26,-4 C -38,-4 -48,-14 -48,-26 Z";

/**
 * A foot: no leg, just a paw tucked under the body. It always overlaps the belly, so as it
 * shuffles (see the run loop) it can slide and lift but never drop away from the body.
 */
function Foot({ x, y, far, footRef }: { x: number; y: number; far?: boolean; footRef: GRef }) {
  return (
    <g ref={footRef}>
      <ellipse cx={x} cy={y} rx="8.5" ry={FOOT_RY} class={far ? "g-paw-far" : "g-paw"} />
    </g>
  );
}

function Figure({ refs, id }: { refs: FigureRefs; id: string }) {
  return (
    <g ref={refs.root}>
      <defs>
        <clipPath id={`body-${id}`}>
          <path d={BODY} />
        </clipPath>
      </defs>
      {/* A long, plain tail from high on the rump, curving up the inside of the wheel. */}
      <g ref={refs.tail} transform="translate(-44 -22)">
        <path d={TAIL} class="g-outline" stroke-width={TAIL_WIDTH + 6.4} fill="none" stroke-linecap="round" />
        <path d={TAIL} class="g-tail" stroke-width={TAIL_WIDTH} fill="none" stroke-linecap="round" />
      </g>
      <Foot {...FEET[0]} far footRef={refs.legs[0]} />
      <Foot {...FEET[1]} far footRef={refs.legs[1]} />
      <path d={BODY} class="g-body" />
      <g clip-path={`url(#body-${id})`}>
        <path
          d="M -50,-24 C -50,-50 -20,-60 6,-62 C 18,-63 28,-68 40,-66 C 30,-54 14,-44 -4,-38 C -20,-32 -36,-26 -50,-24 Z"
          class="g-patch"
        />
        <ellipse cx="16" cy="-6" rx="34" ry="12" class="g-belly" />
      </g>
      <path d={BODY} class="g-line" />
      {/* The sunglasses' arm runs back behind the ear. */}
      <g ref={refs.shadesArm} display="none">
        <line x1="34" y1="-46" x2="20" y2="-52" class="g-shades-arm" />
      </g>
      <g ref={refs.ear} transform="translate(22 -58)">
        <ellipse rx="9" ry="12" transform="rotate(-18)" class="g-ear" />
        <ellipse rx="5" ry="7.5" transform="rotate(-18) translate(0.5 1)" class="g-ear-in" />
      </g>
      <g ref={refs.eyes} class="g-eyes">
        <g class="eye-open">
          <ellipse cx="42" cy="-43" rx="6" ry="7.5" class="g-eye" />
          <circle cx="44.2" cy="-46" r="2.3" fill="#fff" />
          <circle cx="40.5" cy="-40" r="1.1" fill="#fff" />
        </g>
        <path class="eye-star" d="M42,-52 L44.4,-46 L50.5,-45.4 L45.8,-41.4 L47.3,-35.3 L42,-38.6 L36.7,-35.3 L38.2,-41.4 L33.5,-45.4 L39.6,-46 Z" />
        <path class="eye-happy" d="M36,-42 Q42,-50 48,-42" fill="none" stroke-width="3" stroke-linecap="round" />
      </g>
      {/* Sunglasses, worn from Gerbrilliant (80%) onwards. */}
      <g ref={refs.shades} class="g-shades" display="none">
        <line x1="51" y1="-46" x2="59.5" y2="-45.5" class="g-shades-arm" />
        <path d="M32,-50 H52 Q53,-40 47,-37 H38 Q32,-39 32,-50 Z" class="g-shades-lens" />
        <path d="M36,-47 L40,-47 L37,-41 Z" class="g-shades-glint" />
      </g>
      <ellipse cx="49" cy="-30" rx="6" ry="3.4" class="g-blush" />
      <circle cx="61" cy="-38" r="3.2" class="g-nose" />
      <path d="M53,-30 q2,3 4,0 q2,3 4,0" class="g-mouth" fill="none" stroke-width="1.8" stroke-linecap="round" />
      <g class="g-whiskers" stroke-width="1.2" stroke-linecap="round">
        <line x1="60" y1="-34" x2="80" y2="-40" />
        <line x1="60" y1="-33" x2="82" y2="-33" />
        <line x1="60" y1="-32" x2="78" y2="-25" />
      </g>
      <Foot {...FEET[2]} footRef={refs.legs[2]} />
      <Foot {...FEET[3]} footRef={refs.legs[3]} />
    </g>
  );
}

interface ChampionRefs {
  root: GRef;
  tail: GRef;
  trophy: GRef;
}

/** The gerbil facing the player, shades on, holding up a #1 trophy: the Smashdown finale. */
function Champion({ refs }: { refs: ChampionRefs }) {
  return (
    <g ref={refs.root} opacity="0">
      <defs>
        <clipPath id="champ-body">
          <ellipse cx="0" cy="-36" rx="30" ry="35" />
        </clipPath>
      </defs>
      <g ref={refs.tail}>
        <path d="M16,-14 C44,-12 60,-28 62,-60" class="g-outline" stroke-width={TAIL_WIDTH + 6.4} fill="none" stroke-linecap="round" />
        <path d="M16,-14 C44,-12 60,-28 62,-60" class="g-tail" stroke-width={TAIL_WIDTH} fill="none" stroke-linecap="round" />
      </g>
      <g transform="translate(-19 -64) rotate(-22)">
        <ellipse rx="9" ry="11.5" class="g-ear" />
        <ellipse rx="5" ry="7" transform="translate(0 1)" class="g-ear-in" />
      </g>
      <g transform="translate(19 -64) rotate(22)">
        <ellipse rx="9" ry="11.5" class="g-ear" />
        <ellipse rx="5" ry="7" transform="translate(0 1)" class="g-ear-in" />
      </g>
      <ellipse cx="-12" cy="-1" rx="8" ry="4" class="g-paw" />
      <ellipse cx="12" cy="-1" rx="8" ry="4" class="g-paw" />
      <ellipse cx="0" cy="-36" rx="30" ry="35" class="g-body" />
      <g clip-path="url(#champ-body)">
        <path d="M-34,-48 C-28,-80 28,-80 34,-48 C22,-56 -22,-56 -34,-48 Z" class="g-patch" />
        <path d="M-34,-48 C-30,-30 -32,-14 -28,0 L-40,0 L-40,-48 Z" class="g-patch" />
        <path d="M34,-48 C30,-30 32,-14 28,0 L40,0 L40,-48 Z" class="g-patch" />
        <ellipse cx="0" cy="-18" rx="21" ry="20" class="g-belly" />
      </g>
      <ellipse cx="0" cy="-36" rx="30" ry="35" class="g-line" />
      <g class="g-shades">
        <line x1="-27" y1="-52" x2="27" y2="-52" class="g-shades-arm" />
        <path d="M-21,-55 H-3 Q-3,-46 -9,-44 H-16 Q-21,-46 -21,-55 Z" class="g-shades-lens" />
        <path d="M3,-55 H21 Q21,-46 16,-44 H9 Q3,-46 3,-55 Z" class="g-shades-lens" />
        <path d="M-17,-53 L-14,-53 L-16,-48 Z" class="g-shades-glint" />
        <path d="M7,-53 L10,-53 L8,-48 Z" class="g-shades-glint" />
      </g>
      <ellipse cx="-17" cy="-39" rx="5" ry="3" class="g-blush" />
      <ellipse cx="17" cy="-39" rx="5" ry="3" class="g-blush" />
      <ellipse cx="0" cy="-42" rx="2.6" ry="2" class="g-nose" />
      <path d="M-4,-38 q2,3 4,0 q2,3 4,0" class="g-mouth" fill="none" stroke-width="1.6" stroke-linecap="round" />
      <g class="g-whiskers" stroke-width="1.1" stroke-linecap="round">
        <line x1="-8" y1="-41" x2="-28" y2="-45" />
        <line x1="-8" y1="-39" x2="-29" y2="-38" />
        <line x1="8" y1="-41" x2="28" y2="-45" />
        <line x1="8" y1="-39" x2="29" y2="-38" />
      </g>
      <g ref={refs.trophy}>
        <path d="M-11,-33 H11 C11,-22 6,-16 0,-15 C-6,-16 -11,-22 -11,-33 Z" class="g-trophy" />
        <rect x="-2" y="-15" width="4" height="5" class="g-trophy" />
        <rect x="-8" y="-11" width="16" height="5" rx="1.5" class="g-trophy" />
        <text x="0" y="-21.5" class="g-trophy-text" text-anchor="middle">
          #1
        </text>
        <ellipse cx="-10.5" cy="-25" rx="4.5" ry="5" class="g-paw" />
        <ellipse cx="10.5" cy="-25" rx="4.5" ry="5" class="g-paw" />
      </g>
    </g>
  );
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeIn = (t: number) => t * t;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
function bounce(t: number) {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  life: number;
  star?: boolean;
}

const CONFETTI = ["#F08A3C", "#F7A8B8", "#6CC3C1", "#FFD166", "#8E7DFF", "#5BAA6A"];

export function Gerbil({ pct, finished, brilliantKey, smashKey, animate }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const wheelGroup = useRef<SVGGElement>(null);
  const wheel = useRef<SVGGElement>(null);
  const bolt = useRef<SVGCircleElement>(null);
  const standLegs = [useRef<SVGLineElement>(null), useRef<SVGLineElement>(null)];
  const speedLines = useRef<SVGGElement>(null);
  const sweat = useRef<SVGPathElement>(null);
  const dizzy = useRef<SVGGElement>(null);
  const runner = useFigureRefs();
  const champ: ChampionRefs = { root: useRef(null), tail: useRef(null), trophy: useRef(null) };

  // Mutable animation state shared with the loop.
  const anim = useRef({
    pct,
    finished,
    animate,
    angle: 0,
    speed: 0,
    phase: 0,
    smashAt: -1,
    brilliantAt: -1,
    blinkAt: 2,
    particles: [] as Particle[],
  });
  anim.current.pct = pct;
  anim.current.finished = finished;
  anim.current.animate = animate;

  const firstBrilliant = useRef(brilliantKey);
  const firstSmash = useRef(smashKey);
  // Layout effects run before the next frame, so a just-finished puzzle never flashes its aftermath.
  useLayoutEffect(() => {
    if (brilliantKey !== firstBrilliant.current) anim.current.brilliantAt = performance.now() / 1000;
  }, [brilliantKey]);
  useLayoutEffect(() => {
    if (smashKey !== firstSmash.current) anim.current.smashAt = performance.now() / 1000;
  }, [smashKey]);

  useEffect(() => {
    const ctx = canvas.current!.getContext("2d")!;
    let size = { w: 0, h: 0, dpr: 1 };
    const resize = () => {
      const rect = stage.current!.getBoundingClientRect();
      size = { w: rect.width, h: rect.height, dpr: window.devicePixelRatio || 1 };
      canvas.current!.width = rect.width * size.dpr;
      canvas.current!.height = rect.height * size.dpr;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage.current!);

    const burst = (count: number, star: boolean, fromTop: boolean) => {
      const a = anim.current;
      for (let i = 0; i < (a.animate ? count : 0); i++) {
        const angle = Math.random() * Math.PI * 2;
        const v = 120 + Math.random() * 260;
        a.particles.push({
          x: fromTop ? Math.random() * size.w : size.w / 2,
          y: fromTop ? -10 - Math.random() * size.h * 0.5 : size.h * 0.62,
          vx: fromTop ? (Math.random() - 0.5) * 60 : Math.cos(angle) * v,
          vy: fromTop ? 60 + Math.random() * 120 : Math.sin(angle) * v - 160,
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 12,
          size: star ? 6 + Math.random() * 6 : 5 + Math.random() * 5,
          color: star ? (Math.random() < 0.5 ? "#FFD166" : "#FFF3B0") : CONFETTI[i % CONFETTI.length],
          life: fromTop ? 4 : 1.6 + Math.random() * 0.8,
          star,
        });
      }
    };

    const setT = (el: Element | null, t: string) => el?.setAttribute("transform", t);
    const show = (el: Element | null, on: boolean) => el?.setAttribute("opacity", on ? "1" : "0");

    let last = performance.now() / 1000;
    let raf = 0;
    let brilliantPlayed = -1;
    let confettiPlayed = -1;
    let trophyPlayed = -1;

    const frame = () => {
      const now = performance.now() / 1000;
      const dt = Math.min(0.05, now - last);
      last = now;
      const a = anim.current;
      // With animation off the scene is drawn in its resting pose: no spinning, swaying,
      // blinking, particles or Smashdown sequence (its final scene is shown straight away).
      const still = !a.animate;

      // A day that's already solved replays the Smashdown each time it's opened. (Checked
      // here rather than on mount because the puzzle, and so `finished`, arrives later.)
      if (a.finished && a.smashAt < 0 && !still) a.smashAt = now + 0.9;

      // Smashdown timeline, or the settled aftermath.
      const smashT = a.smashAt >= 0 ? now - a.smashAt : -Infinity;
      const smashing = smashT >= 0 && smashT < SMASH_SECONDS && !still;
      const aftermath = smashT >= SMASH_SECONDS || (a.finished && (still || a.smashAt < 0));

      // Wheel speed eases towards the target for the current progress.
      const target = smashing ? MAX_SPEED * 1.6 : a.pct <= 0 ? 0 : MAX_SPEED * (0.12 + 0.88 * easeOut(a.pct / 100));
      a.speed = still ? 0 : a.speed + (target - a.speed) * Math.min(1, dt * 1.8);
      a.angle = (a.angle + a.speed * dt) % (Math.PI * 2);
      const pace = clamp(a.speed / 2);
      a.phase += a.speed * 3.1 * dt;

      // Wheel, stand and runner.
      let wx = 0;
      let wy = 0;
      let collapse = 0;
      let boltPos = { x: WHEEL.x, y: WHEEL.y, o: 1 };
      if (smashing) {
        if (smashT < 1.2) {
          const k = smashT / 1.2;
          wx = Math.sin(now * 70) * 3.5 * k;
          wy = Math.cos(now * 55) * 2.5 * k;
        } else {
          const t = smashT - 1.2;
          wx = 140 * t + 170 * t * t;
          wy = -Math.abs(Math.sin(t * 7)) * 22 * Math.exp(-t * 0.8);
          const bt = Math.min(t, 1.4);
          boltPos = { x: WHEEL.x - 120 * bt, y: WHEEL.y - 260 * bt + 300 * bt * bt, o: clamp(1 - bt / 1.4) };
          collapse = bounce(clamp(t / 0.9));
        }
        if (smashT >= 1.25 && confettiPlayed !== a.smashAt) {
          confettiPlayed = a.smashAt;
          burst(90, false, false);
          burst(70, false, true);
        }
      }
      const wheelGone = aftermath || (smashing && smashT > 4);
      setT(wheelGroup.current, `translate(${wx} ${wy})`);
      show(wheelGroup.current, !wheelGone);
      setT(wheel.current, `rotate(${(a.angle * 180) / Math.PI} ${WHEEL.x} ${WHEEL.y})`);
      if (bolt.current) {
        bolt.current.setAttribute("cx", String(boltPos.x));
        bolt.current.setAttribute("cy", String(boltPos.y));
        bolt.current.setAttribute("opacity", String(aftermath ? 0 : boltPos.o));
      }
      // The stand's legs fold out flat once the wheel has gone.
      const fold = aftermath ? 1 : collapse;
      standLegs.forEach((leg, i) => {
        leg.current?.setAttribute("x2", String(200 + (i ? 1 : -1) * 150 * fold));
        leg.current?.setAttribute("y2", String(140 + 142 * fold));
      });

      // Runner's feet, bob, lean, tail and ears. The body bobs and leans into the run; the
      // feet slide back and forth under the belly and are each dropped or raised so the sole
      // sits exactly on the curved tread, within limits that keep them overlapping the body.
      const bob = -Math.abs(Math.sin(a.phase)) * 1.2 * pace;
      const lean = pace * 6;
      const theta = (lean * Math.PI) / 180;
      const rootY = RUNNER_Y + bob;
      runner.legs.forEach((foot, i) => {
        const dx = Math.sin(a.phase + (i % 3 === 0 ? 0 : Math.PI)) * 5 * pace;
        // Where the sole would land with no adjustment (local point -> stage coordinates).
        const lx = FEET[i].x + dx - BACK_FOOT.x;
        const ly = FEET[i].y + FOOT_RY - BACK_SOLE_Y;
        const wx = 192 + RUNNER_SCALE * (BACK_FOOT.x + lx * Math.cos(theta) - ly * Math.sin(theta));
        const wy = rootY + RUNNER_SCALE * (BACK_SOLE_Y + lx * Math.sin(theta) + ly * Math.cos(theta));
        const tread = WHEEL.y + Math.sqrt(TREAD_R * TREAD_R - (wx - WHEEL.x) ** 2);
        const dy = clamp((tread - wy) / (RUNNER_SCALE * Math.cos(theta)), -7, 2.5);
        setT(foot.current, `translate(${dx} ${dy})`);
      });
      setT(
        runner.root.current,
        `translate(192 ${rootY}) scale(${RUNNER_SCALE}) rotate(${lean} ${BACK_FOOT.x} ${BACK_SOLE_Y})`,
      );
      const tailSway = still ? 0 : Math.sin(now * (a.speed > 0.3 ? 9 : 2.2)) * (a.speed > 0.3 ? 3 : 4);
      setT(runner.tail.current, `translate(-44 -22) rotate(${tailSway})`);
      setT(runner.ear.current, `translate(22 -58) rotate(${-pace * 14 + Math.sin(now * 12) * 3 * pace})`);

      // Speed lines and sweat at high speed.
      const fast = clamp((a.speed / MAX_SPEED - 0.6) * 3);
      speedLines.current?.setAttribute("opacity", String(fast * (0.6 + 0.4 * Math.sin(now * 20))));
      setT(speedLines.current, `translate(${-((now * 160) % 30)} 0)`);
      // The sweat drop fades in, falls and fades out, then pauses before the next one.
      const sweating = clamp((a.speed / MAX_SPEED - 0.8) * 5);
      const t = (now % SWEAT_CYCLE) / SWEAT_CYCLE;
      const fall = easeIn(clamp((t - 0.1) / 0.45));
      const visible = still ? 1 : Math.min(clamp(t / 0.1), clamp((0.55 - t) / 0.15));
      sweat.current?.setAttribute("opacity", String(sweating * visible));
      setT(sweat.current, `translate(0 ${still ? 0 : fall * 16})`);

      // Blinking, star eyes after Gerbrilliant.
      if (now > a.blinkAt + 0.14) a.blinkAt = now + 2.5 + Math.random() * 3;
      const blinking = !still && now > a.blinkAt;
      const starry = !still && a.brilliantAt >= 0 && now - a.brilliantAt < 2.2;
      // Shades drop on once the star eyes fade (or are simply on, for a day already past 80%).
      const cool = a.pct >= GERBRILLIANT && !starry;
      const drop = !still && a.brilliantAt >= 0 ? easeOut(clamp((now - a.brilliantAt - 2.2) / 0.45)) : 1;
      for (const part of [runner.shades, runner.shadesArm]) {
        part.current?.setAttribute("display", cool ? "inline" : "none");
        setT(part.current, `translate(0 ${-36 * (1 - drop)})`);
      }
      runner.eyes.current?.setAttribute("class", `g-eyes ${starry ? "starry" : blinking ? "blink" : ""}`);
      if (a.brilliantAt >= 0 && brilliantPlayed !== a.brilliantAt) {
        brilliantPlayed = a.brilliantAt;
        burst(40, true, false);
      }

      // The champion hops back in, dizzy, lands facing you and raises the trophy.
      let cx = 0;
      let hop = 0;
      let raise = aftermath ? 1 : 0;
      if (smashing && smashT > 3.4) {
        const k = clamp((smashT - 3.4) / 1.6);
        cx = 240 * (1 - easeOut(k));
        hop = -Math.abs(Math.sin(k * Math.PI * 4)) * 16 * (1 - k * 0.6);
        raise = easeOut(clamp((smashT - 5.1) / 0.35));
        if (smashT > 5.15 && trophyPlayed !== a.smashAt) {
          trophyPlayed = a.smashAt;
          burst(30, true, false);
        }
      }
      show(champ.root.current, aftermath || (smashing && smashT > 3.4));
      const sway = still ? 0 : 1;
      const breathe = 1 + Math.sin(now * 2.4) * 0.012 * sway;
      setT(champ.root.current, `translate(${200 + cx} ${286 + hop}) scale(1.15 ${1.15 * breathe})`);
      setT(champ.tail.current, `rotate(${Math.sin(now * 3) * 8 * sway} 16 -12)`);
      setT(champ.trophy.current, `translate(0 ${-9 * raise}) rotate(${Math.sin(now * 2) * 3 * raise * sway} 0 -20)`);
      const dizzyOn = smashing && smashT > 3.4 && smashT < 5.2;
      show(dizzy.current, dizzyOn);
      setT(dizzy.current, `translate(${200 + cx} ${286 + hop - 92}) rotate(${(now * 240) % 360})`);

      // Particles.
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      a.particles = a.particles.filter((p) => (p.life -= dt) > 0 && p.y < size.h + 20);
      for (const p of a.particles) {
        p.vy += (p.star ? 220 : 380) * dt;
        p.vx *= 1 - dt * 0.8;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        ctx.save();
        ctx.globalAlpha = clamp(p.life * 1.5);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.star) {
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const r = i % 2 ? p.size * 0.45 : p.size;
            ctx.lineTo(Math.cos((i * Math.PI) / 5) * r, Math.sin((i * Math.PI) / 5) * r);
          }
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const rungs = Array.from({ length: 30 }, (_, i) => (i / 30) * Math.PI * 2);
  const spokes = Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2);

  return (
    <div class="stage" ref={stage} aria-hidden="true">
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
        <ellipse cx="200" cy="290" rx="150" ry="9" class="shadow" />
        <g class="bedding">
          {[60, 92, 118, 150, 300, 322, 350].map((x, i) => (
            <path d={`M${x},${291 + (i % 2)} q6,-5 12,0`} />
          ))}
        </g>
        <g>
          <line ref={standLegs[0]} x1="128" y1="284" x2="200" y2="140" class="stand" />
          <line ref={standLegs[1]} x1="272" y1="284" x2="200" y2="140" class="stand" />
          <line x1="104" y1="286" x2="296" y2="286" class="stand" />
        </g>
        <g ref={wheelGroup}>
          <g ref={wheel}>
            <circle cx={WHEEL.x} cy={WHEEL.y} r={WHEEL.r} class="wheel-rim" />
            <circle cx={WHEEL.x} cy={WHEEL.y} r={WHEEL.r - 10} class="wheel-tread" />
            {spokes.map((t) => (
              <line
                x1={WHEEL.x}
                y1={WHEEL.y}
                x2={WHEEL.x + Math.cos(t) * (WHEEL.r - 12)}
                y2={WHEEL.y + Math.sin(t) * (WHEEL.r - 12)}
                class="wheel-spoke"
              />
            ))}
            {rungs.map((t) => (
              <circle cx={WHEEL.x + Math.cos(t) * (WHEEL.r - 5)} cy={WHEEL.y + Math.sin(t) * (WHEEL.r - 5)} r="2.4" class="wheel-rung" />
            ))}
            <circle cx={WHEEL.x} cy={WHEEL.y} r="13" class="wheel-hub" />
          </g>
          <g ref={speedLines} class="speed-lines">
            <line x1="104" y1="200" x2="136" y2="200" />
            <line x1="96" y1="216" x2="122" y2="216" />
            <line x1="108" y1="232" x2="132" y2="232" />
          </g>
          <Figure refs={runner} id="runner" />
          <path ref={sweat} d="M262,170 q-5,8 0,11 q5,-3 0,-11 Z" class="sweat" opacity="0" />
        </g>
        <circle ref={bolt} cx={WHEEL.x} cy={WHEEL.y} r="5.5" class="wheel-bolt" />
        <Champion refs={champ} />
        <g ref={dizzy} class="dizzy" opacity="0">
          {[0, 120, 240].map((d) => (
            <path transform={`rotate(${d}) translate(16 0) scale(0.55)`} d="M0,-10 L2.9,-4 L9.5,-3.1 L4.7,1.5 L5.9,8 L0,5 L-5.9,8 L-4.7,1.5 L-9.5,-3.1 L-2.9,-4 Z" />
          ))}
        </g>
      </svg>
      <canvas ref={canvas} />
    </div>
  );
}
