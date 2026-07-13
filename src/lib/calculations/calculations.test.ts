import { describe, expect, it } from "vitest";
import { brewRatio, dialInRecommendation, isSweetSpot, loggingStreak, postStopDrip, roastAgeDays, shotScore } from ".";
import { formatDate, formatRatio, formatTime, formatWeight } from "@/lib/formatting";

describe("Espresso-Berechnungen", () => {
  it("berechnet Brew Ratio und Nachlauf", () => { expect(brewRatio(36, 19)).toBeCloseTo(1.8947); expect(postStopDrip(36.2, 34.3)).toBeCloseTo(1.9); });
  it("berechnet das Röstalter kalenderbasiert", () => expect(roastAgeDays("2026-06-27", "2026-07-13")).toBe(16));
  it("begrenzt den Shot-Score und belohnt den Sweet Spot", () => {
    expect(shotScore({ extractionSeconds: 28, brewRatio: 1.95, taste: "balanced", flow: "even", puck: "ideal" })).toBe(98);
    expect(shotScore({ extractionSeconds: 5, brewRatio: 5, taste: "very_sour", flow: "spritzing", puck: "stuck" })).toBe(45);
  });
  it("klassifiziert den Sweet Spot an allen Grenzen", () => { expect(isSweetSpot(25, 1.8)).toBe(true); expect(isSweetSpot(32, 2.15)).toBe(true); expect(isSweetSpot(24.9, 1.95)).toBe(false); });
  it("ermittelt eine Logging-Serie mit maximal sieben Tagen Abstand", () => expect(loggingStreak([{ shot_at: "2026-07-13" }, { shot_at: "2026-07-08" }, { shot_at: "2026-06-28" }])).toBe(2));
});

describe("Dial-in-Regelpriorität", () => {
  const base = { flow: "even" as const, taste: "balanced" as const, extraction_seconds: 28, final_yield_grams: 36, dose_grams: 19, stop_weight_grams: 34 };
  it("priorisiert Channeling vor Mahlgrad", () => expect(dialInRecommendation({ ...base, flow: "channeling", taste: "very_sour", extraction_seconds: 20 }).title).toContain("Puck Prep"));
  it("empfiehlt bei sauer und schnell feiner", () => expect(dialInRecommendation({ ...base, taste: "sour", extraction_seconds: 22 }).title).toContain("feiner"));
  it("empfiehlt bei bitter und langsam gröber", () => expect(dialInRecommendation({ ...base, taste: "bitter", extraction_seconds: 36 }).title).toContain("gröber"));
});

describe("deutsche Formatierung", () => {
  it("formatiert Messwerte", () => { expect(formatRatio(1.894)).toBe("1 : 1,89"); expect(formatWeight(19)).toBe("19,0 g"); expect(formatTime(28.5)).toBe("28,5 s"); });
  it("formatiert Daten deutsch", () => expect(formatDate(new Date("2026-07-13T12:00:00Z"))).toMatch(/13\. Juli 2026/));
});
