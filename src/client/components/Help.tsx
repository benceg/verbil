import { Sheet } from "./Sheet";

interface Props {
  animate: boolean;
  onToggleAnimate: () => void;
  onOpenPuzzles: () => void;
  onClose: () => void;
}

export function Help({ animate, onToggleAnimate, onOpenPuzzles, onClose }: Props) {
  return (
    <Sheet title="How to play" onClose={onClose}>
      <div class="help">
        <p>Find as many synonyms as you can for the daily word.</p>
        <p>Each word you find gives Verbil the Furball Gerbil an energy boost!</p>
        <p>
          At <b>80%</b>, you're certified <b>Gerbrilliant!</b>
          <br />
          At <b>100%</b>, you've achieved <b>Gerbil Smashdown!</b> Enjoy your reward!
        </p>
        <p>
          Use hints freely and check your <b>Stats</b> to see how many words are left.
        </p>
        <p>
          There's a new word every day, and you can{" "}
          <button type="button" class="text-link" onClick={onOpenPuzzles}>
            play past puzzles
          </button>
          . All progress is saved on your device.
        </p>
        <p class="muted small">
          Some synonym lists contain a small selection of obscure or less commonly used synonyms. Try to find them all!
          And if you think of a synonym we happen to have missed, congratulations! You are the Big Cheese!
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
