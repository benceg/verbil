import { render } from "preact";
import { App } from "./app";
import { checkStorageVersion } from "./game/storage";
import { ANIMATE } from "./settings";
import "./styles.css";

// Before anything reads saved progress: clear data an older version of the game left behind.
checkStorageVersion([ANIMATE]);

// index.html holds a short description for search engines and slow loads; the game replaces it.
const root = document.getElementById("app")!;
root.textContent = "";
render(<App />, root);

// Offline support. Skipped in dev so it doesn't cache Vite's live modules.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}
