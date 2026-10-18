import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts: the Cloudflare plugin starts its own server.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
