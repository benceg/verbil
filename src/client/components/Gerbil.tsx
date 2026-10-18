import type { RefObject } from "preact";

type GRef = RefObject<SVGGElement | null>;
import { useEffect, useLayoutEffect, useRef } from "preact/hooks";

/*
 * The gerbil stage: an SVG scene animated from one requestAnimationFrame loop.
 * Elements are mutated through refs every frame rather than re-rendered.
 *
 * - The wheel's speed eases towards a target set by the player's progress.
 * - `brilliantKey` changing plays the Gerbrilliant sparkle (star eyes + burst).
 * - `smashKey` changing plays the Gerbil Smashdown: the wheel shakes loose,
 *   rolls off-screen and the gerbil wanders back, dizzy, to sit by the wreck.
 * - `finished` shows that aftermath straight away (e.g. revisiting a solved day).
 */

interface Props {
  pct: number;
  finished: boolean;
  brilliantKey: number;
  smashKey: number;
}

const WHEEL = { x: 200, y: 140, r: 112 };
const MAX_SPEED = 7.5; // radians per second at 100%
const SMASH_SECONDS = 6.5;

interface FigureRefs {
  root: GRef;
  tail: GRef;
  legs: GRef[]; // far-back, far-front, near-back, near-front
  eyes: GRef;
  ear: GRef;
}

function useFigureRefs(): FigureRefs {
  return {
    root: useRef<SVGGElement>(null),
    tail: useRef<SVGGElement>(null),
    legs: [useRef<SVGGElement>(null), useRef<SVGGElement>(null), useRef<SVGGElement>(null), useRef<SVGGElement>(null)],
    eyes: useRef<SVGGElement>(null),
    ear: useRef<SVGGElement>(null),
  };
}

const BODY =
  "M -40,-6 C -54,-20 -48,-48 -20,-54 C 0,-60 14,-66 32,-64 C 50,-62 62,-50 62,-38 C 62,-28 56,-20 46,-16 C 36,-6 20,-4 0,-4 C -20,-4 -32,-2 -40,-6 Z";

function Leg({ x, far, legRef }: { x: number; far?: boolean; legRef: GRef }) {
  return (
    <g transform={`translate(${x} -12)`}>
      <g ref={legRef}>
        <line x1="0" y1="0" x2="0" y2="9" class="g-outline" stroke-width="10" stroke-linecap="round" />
        <line x1="0" y1="0" x2="0" y2="9" class={far ? "g-fur-far" : "g-fur"} stroke-width="5" stroke-linecap="round" />
        <ellipse cx="4" cy="11" rx="7" ry="3.6" class={far ? "g-paw-far" : "g-paw"} />
      </g>
    </g>
  );
}

function Figure({ refs, id, seed }: { refs: FigureRefs; id: string; seed?: boolean }) {
  return (
    <g ref={refs.root}>
      <defs>
        <clipPath id={`body-${id}`}>
          <path d={BODY} />
        </clipPath>
      </defs>
      <g ref={refs.tail} transform="translate(-40 -12)">
        <path d="M 0,0 C -20,4 -36,-6 -46,-22" class="g-outline" stroke-width="7" fill="none" stroke-linecap="round" />
        <path d="M 0,0 C -20,4 -36,-6 -46,-22" class="g-tail" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <ellipse cx="-48" cy="-25" rx="7" ry="4.5" transform="rotate(-50 -48 -25)" class="g-tuft" />
      </g>
      <Leg x={-18} far legRef={refs.legs[0]} />
      <Leg x={34} far legRef={refs.legs[1]} />
      <path d={BODY} class="g-body" />
      <g clip-path={`url(#body-${id})`}>
        <path
          d="M -50,-24 C -50,-50 -20,-60 6,-62 C 18,-63 28,-68 40,-66 C 30,-54 14,-44 -4,-38 C -20,-32 -36,-26 -50,-24 Z"
          class="g-patch"
        />
        <ellipse cx="16" cy="-6" rx="34" ry="12" class="g-belly" />
      </g>
      <path d={BODY} class="g-line" />
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
      <ellipse cx="49" cy="-30" rx="6" ry="3.4" class="g-blush" />
      <circle cx="61" cy="-38" r="3.2" class="g-nose" />
      <path d="M53,-30 q2,3 4,0 q2,3 4,0" class="g-mouth" fill="none" stroke-width="1.8" stroke-linecap="round" />
      <g class="g-whiskers" stroke-width="1.2" stroke-linecap="round">
        <line x1="60" y1="-34" x2="80" y2="-40" />
        <line x1="60" y1="-33" x2="82" y2="-33" />
        <line x1="60" y1="-32" x2="78" y2="-25" />
      </g>
      {seed && (
        <g transform="translate(46 -14) rotate(-20)">
          <ellipse rx="6" ry="10" class="g-seed" />
          <path d="M0,-9 L0,9 M-3,-8 Q-4,0 -3,8 M3,-8 Q4,0 3,8" class="g-seed-stripe" fill="none" stroke-width="1.2" />
        </g>
      )}
      <Leg x={-22} legRef={refs.legs[2]} />
      <Leg x={30} legRef={refs.legs[3]} />
    </g>
  );
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
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

export function Gerbil({ pct, finished, brilliantKey, smashKey }: Props) {
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
  const sitter = useFigureRefs();

  // Mutable animation state shared with the loop.
  const anim = useRef({
    pct,
    finished,
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
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      for (let i = 0; i < (reduced ? 0 : count); i++) {
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

    const frame = () => {
      const now = performance.now() / 1000;
      const dt = Math.min(0.05, now - last);
      last = now;
      const a = anim.current;

      // Smashdown timeline, or the settled aftermath.
      const smashT = a.smashAt >= 0 ? now - a.smashAt : -1;
      const smashing = smashT >= 0 && smashT < SMASH_SECONDS && !reduced;
      const aftermath = (a.finished && !smashing) || (smashT >= 0 && (smashT >= SMASH_SECONDS || reduced));

      // Wheel speed eases towards the target for the current progress.
      const target = smashing ? MAX_SPEED * 1.6 : a.pct <= 0 ? 0 : MAX_SPEED * (0.12 + 0.88 * easeOut(a.pct / 100));
      a.speed += (target - a.speed) * Math.min(1, dt * 1.8);
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

      // Runner's legs, bob, tail and ears.
      const swing = Math.sin(a.phase) * 34 * pace;
      const legs = [swing, -swing, -swing, swing];
      runner.legs.forEach((leg, i) => setT(leg.current, `rotate(${legs[i]})`));
      const bob = -Math.abs(Math.sin(a.phase)) * 3.5 * pace;
      const lean = pace * 6;
      setT(runner.root.current, `translate(192 ${239 + bob}) rotate(${lean}) scale(1.12)`);
      const tailSway = Math.sin(now * (a.speed > 0.3 ? 9 : 2.2)) * (a.speed > 0.3 ? 5 : 7);
      setT(runner.tail.current, `translate(-40 -12) rotate(${-pace * 28 + tailSway})`);
      setT(runner.ear.current, `translate(22 -58) rotate(${-pace * 14 + Math.sin(now * 12) * 3 * pace})`);

      // Speed lines and sweat at high speed.
      const fast = clamp((a.speed / MAX_SPEED - 0.6) * 3);
      speedLines.current?.setAttribute("opacity", String(fast * (0.6 + 0.4 * Math.sin(now * 20))));
      setT(speedLines.current, `translate(${-((now * 160) % 30)} 0)`);
      sweat.current?.setAttribute("opacity", String(clamp((a.speed / MAX_SPEED - 0.8) * 5)));

      // Blinking, star eyes after Gerbrilliant.
      if (now > a.blinkAt + 0.14) a.blinkAt = now + 2.5 + Math.random() * 3;
      const blinking = now > a.blinkAt;
      const starry = a.brilliantAt >= 0 && now - a.brilliantAt < 2.2;
      runner.eyes.current?.setAttribute("class", `g-eyes ${starry ? "starry" : blinking ? "blink" : ""}`);
      if (a.brilliantAt >= 0 && brilliantPlayed !== a.brilliantAt) {
        brilliantPlayed = a.brilliantAt;
        burst(40, true, false);
      }

      // The sitter walks back in after the smash and stays.
      let sx = 0;
      let walking = false;
      if (smashing && smashT > 3.4) {
        const k = clamp((smashT - 3.4) / 1.8);
        sx = 240 * (1 - easeOut(k));
        walking = k < 1;
      }
      const sitterVisible = aftermath || (smashing && smashT > 3.4);
      show(sitter.root.current, sitterVisible);
      const step = walking ? Math.sin(now * 18) * 28 : 0;
      sitter.legs.forEach((leg, i) => setT(leg.current, `rotate(${i % 3 === 0 ? step : -step})`));
      const sitBob = walking ? -Math.abs(Math.sin(now * 18)) * 3 : 0;
      setT(sitter.root.current, `translate(${206 + sx} ${282 + sitBob}) rotate(${walking ? 0 : -8}) scale(0.95)`);
      setT(sitter.tail.current, `translate(-40 -12) rotate(${Math.sin(now * 1.6) * 8})`);
      sitter.eyes.current?.setAttribute("class", `g-eyes ${walking ? (blinking ? "blink" : "") : "happy"}`);
      const dizzyOn = smashing && smashT > 3.4;
      show(dizzy.current, dizzyOn);
      setT(dizzy.current, `translate(${206 + sx + 30} ${282 - 78}) rotate(${(now * 240) % 360})`);

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
        <Figure refs={sitter} id="sitter" seed />
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
