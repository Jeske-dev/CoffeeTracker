import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("Dialed PWA", () => {
  it("liefert ein installierbares Manifest mit vorhandenen Icons", () => {
    const value = manifest();
    expect(value).toMatchObject({
      name: "Dialed – Espresso Tracker",
      id: "/",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#F9F9F9",
      theme_color: "#F9F9F9",
      lang: "de-DE",
    });
    expect(value.icons).toHaveLength(3);
    for (const icon of value.icons ?? []) expect(existsSync(resolve("public", icon.src.replace(/^\//, "")))).toBe(true);
    expect(existsSync(resolve("public/icons/apple-touch-icon.png"))).toBe(true);
    expect(existsSync(resolve("src/app/favicon.ico"))).toBe(true);
  });

  it("cached keine Dokumente, privaten App-Routen oder schreibenden Requests", () => {
    const worker = readFileSync(resolve("public/sw.js"), "utf8");
    expect(worker).toContain('request.method !== "GET"');
    expect(worker).toContain('url.origin !== self.location.origin');
    expect(worker).toContain('url.pathname.startsWith("/_next/static/")');
    expect(worker).not.toContain('url.pathname.startsWith("/app")');
    expect(worker).not.toContain("supabase");
  });
});
