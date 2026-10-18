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
          Every day there's a new verb. Find as many <b>single-word synonyms</b> as you can. Every meaning of the verb
          counts, so <b>RUN</b> takes <b>SPRINT</b>, <b>MANAGE</b> and <b>FLOW</b>.
        </p>
        <p>Any form of a word works: JOGGING counts as JOG.</p>
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
          Stuck? <b>Hints</b> show which meanings you're missing and nudge you towards a word.
        </p>
        <p class="muted small">
          You can replay any past day, but tomorrow's puzzle stays locked until tomorrow. Your progress is saved on
          this device. Word lists are built from Princeton WordNet and curated by hand.
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
