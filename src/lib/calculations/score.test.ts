import { describe, expect, it } from "vitest";
import { calculateDialedScore } from ".";

const complete = { doseGrams: 19, finalYieldGrams: 36, extractionSeconds: 28, tasteBalance: "balanced" as const, flow: "even" as const, puck: "ideal" as const };

describe("Dialed Score mit Teil-Scores", () => {
  it("behandelt fehlende einzelne Messwerte als nicht vorhanden", () => {
    const result = calculateDialedScore({ ...complete, extractionSeconds: null });
    expect(result.score).toBeNull();
    expect(result.components.recipe.score).not.toBeNull();
    expect(result.components.recipe.coverage).toBe(60);
  });
  it("lässt vollständig fehlende Teil-Scores auf null", () => {
    const result = calculateDialedScore({ doseGrams: null, finalYieldGrams: null, extractionSeconds: null });
    expect(result.score).toBeNull();
    expect(result.components.sensory.score).toBeNull();
    expect(result.components.recipe.score).toBeNull();
    expect(result.components.flowPuck.score).toBeNull();
  });
  it("normalisiert die Gewichte nur über vorhandene Komponenten", () => {
    const result = calculateDialedScore({ ...complete, previousComparableScores: [80, 90, 100] });
    expect(result.score).toBeGreaterThan(0);
    expect(result.components.consistency.score).toBe(90);
  });
  it("berechnet den Gesamtscore erst mit den Mindestdaten", () => {
    expect(calculateDialedScore({ doseGrams: 19, finalYieldGrams: 36, extractionSeconds: 28 }).score).toBeNull();
    expect(calculateDialedScore({ ...complete }).score).not.toBeNull();
  });
  it("berechnet Rezeptwert ohne TDS und ohne historische Shots", () => {
    const result = calculateDialedScore(complete);
    expect(result.components.recipe.score).not.toBeNull();
    expect(result.components.chemistry.score).toBeNull();
    expect(result.components.consistency.score).toBeNull();
  });
  it("führt die Core-Datenabdeckung getrennt vom Score", () => {
    const result = calculateDialedScore({ ...complete, overallTasteRating: 4 });
    expect(result.coverage).toBeGreaterThan(0);
    expect(result.coverage).toBeLessThanOrEqual(100);
    expect(result.coverageLabel).toBeTruthy();
  });
  it("erfordert Flow oder Channeling für FlowPuckScore", () => {
    expect(calculateDialedScore({ ...complete, flow: null, puck: null }).components.flowPuck.score).toBeNull();
    expect(calculateDialedScore({ ...complete, flow: null, puck: null, channeling: false }).components.flowPuck.score).not.toBeNull();
  });
});
