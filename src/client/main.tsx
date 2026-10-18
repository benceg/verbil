import { render } from "preact";
import { App } from "./app";
import "./styles.css";

render(<App />, document.getElementById("app")!);

// Offline support. Skipped in dev so it doesn't cache Vite's live modules.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}
