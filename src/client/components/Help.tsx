import { Sheet } from "./Sheet";

interface Props {
  animate: boolean;
  onToggleAnimate: () => void;
  onClose: () => void;
}

export function Help({ animate, onToggleAnimate, onClose }: Props) {
  return (
    <Sheet title="How to play" onClose={onClose}>
      <div class="help">
        <p>
          Every day there's a new word, usually a verb, with the meaning you're looking for underneath. Find as many{" "}
          <b>single-word synonyms</b> as you can. For verbs, particular ways of doing it count too: for <b>RUN</b> as in
          “move fast on foot”, that's <b>SPRINT</b>, <b>JOG</b>, <b>TROT</b>, <b>GALLOP</b> and more.
        </p>
        <p>Any form of a word works: JOGGING counts as JOG, HAPPIER as HAPPY.</p>
        <p>Each word you find makes the gerbil run faster.</p>
        <ul>
          <li>
            <b>80%</b>: Gerbrilliant!
          </li>
          <li>
            <b>100%</b>: Gerbil Smashdown. Find out for yourself.
          </li>
        </ul>
        <p>
          Stuck? <b>Hints</b> show how many words of each length are left and nudge you towards one.
        </p>
        <p class="muted small">
          You can replay any past day, but tomorrow's puzzle stays locked until tomorrow. Your progress is saved on this
          device. Word lists are built from Princeton WordNet, checked against a thesaurus and curated by hand.
        </p>
        <div class="setting">
          <div>
            <b id="animations-label">Animations</b>
            <p class="muted small">Off to start with if your device is set to reduce motion.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={animate}
            aria-labelledby="animations-label"
            class={`switch ${animate ? "on" : ""}`}
            onClick={onToggleAnimate}
          >
            <span class="knob" />
          </button>
        </div>
        <p class="muted small copyright">
          Copyright © {new Date().getFullYear()}{" "}
          <a href="https://ceglow.ski" target="_blank" rel="noopener">
            Ben Ceglowski
          </a>
        </p>
      </div>
    </Sheet>
  );
}
