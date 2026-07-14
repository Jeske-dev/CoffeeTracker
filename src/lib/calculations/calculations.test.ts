import { describe, expect, it } from "vitest";
import { brewRatio, isSweetSpot, loggingStreak, postStopDrip, roastAgeDays, targetScore } from ".";
import { formatDate, formatDateTime, formatRatio, formatTime, formatWeight } from "@/lib/formatting";

describe("Espresso-Berechnungen", () => {
  it("berechnet Brew Ratio und Nachlauf", () => { expect(brewRatio(36, 19)).toBeCloseTo(1.8947); expect(postStopDrip(36.2, 34.3)).toBeCloseTo(1.9); });
  it("berechnet das Röstalter kalenderbasiert", () => expect(roastAgeDays("2026-06-27", "2026-07-13")).toBe(16));
  it("bewertet Zielwerte bei der halben Toleranz mit 50 Punkten", () => { expect(targetScore(2.3, 2, 0.3)).toBeCloseTo(50); expect(targetScore(2, 2, 0.3)).toBe(100); });
  it("klassifiziert den Sweet Spot an allen Grenzen", () => { expect(isSweetSpot(25, 1.8)).toBe(true); expect(isSweetSpot(32, 2.15)).toBe(true); expect(isSweetSpot(24.9, 1.95)).toBe(false); });
  it("ermittelt eine Logging-Serie mit maximal sieben Tagen Abstand", () => expect(loggingStreak([{ shot_at: "2026-07-13" }, { shot_at: "2026-07-08" }, { shot_at: "2026-06-28" }])).toBe(2));
});

describe("deutsche Formatierung", () => {
  it("formatiert Messwerte", () => { expect(formatRatio(1.894)).toBe("1 : 1,89"); expect(formatWeight(19)).toBe("19,0 g"); expect(formatTime(28.5)).toBe("28,5 s"); });
  it("formatiert Daten deutsch", () => expect(formatDate(new Date("2026-07-13T12:00:00Z"))).toMatch(/13\. Juli 2026/));
  it("fängt ungültige historische Datumswerte ab", () => expect(formatDateTime("kein-datum")).toBe("—"));
});
