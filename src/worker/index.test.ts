import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArchiveEntry, Puzzle } from "../shared/types";
import app from "./index";

afterEach(() => vi.useRealTimers());

function at(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

describe("puzzle API", () => {
  it("serves the launch puzzle on launch day", async () => {
    at("2026-10-18T12:00:00Z");
    const res = await app.request("/api/puzzle/2026-10-18");
    expect(res.status).toBe(200);
    expect(((await res.json()) as Puzzle).verb).toBe("RUN");
  });

  it("refuses tomorrow's puzzle", async () => {
    at("2026-10-18T05:00:00Z");
    expect((await app.request("/api/puzzle/2026-10-20")).status).toBe(404);
  });

  it("allows the next day once it has begun in UTC+14", async () => {
    at("2026-10-18T10:00:00Z"); // already 00:00 on the 19th in Kiribati
    expect((await app.request("/api/puzzle/2026-10-19")).status).toBe(200);
    at("2026-10-18T09:59:00Z");
    expect((await app.request("/api/puzzle/2026-10-19")).status).toBe(404);
  });

  it("rejects malformed and pre-launch dates", async () => {
    at("2026-11-01T00:00:00Z");
    for (const d of ["2026-10-17", "2026-13-01", "today", "2026-10-1"]) {
      expect((await app.request(`/api/puzzle/${d}`)).status).toBe(404);
    }
  });

  it("lists only playable puzzles in the archive, newest first", async () => {
    at("2026-10-20T00:00:00Z");
    const list = (await (await app.request("/api/archive")).json()) as ArchiveEntry[];
    expect(list.map((e) => e.date)).toEqual(["2026-10-20", "2026-10-19", "2026-10-18"]);
    expect(list[2].total).toBeGreaterThanOrEqual(24);
  });

  it("redirects http to https on the real site only", async () => {
    const res = await app.request("http://verbil.fun/?date=2026-10-18");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://verbil.fun/?date=2026-10-18");
    expect((await app.request("http://www.verbil.fun/")).status).toBe(301);
    expect((await app.request("http://verbil.example.workers.dev/")).status).toBe(301);
    expect((await app.request("http://localhost/api/archive")).status).toBe(200);
    expect((await app.request("http://192.168.1.20:5173/api/archive")).status).toBe(200);
  });

  it("sends HSTS over https", async () => {
    at("2026-10-20T00:00:00Z");
    const res = await app.request("https://verbil.fun/api/archive");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=");
  });
});
