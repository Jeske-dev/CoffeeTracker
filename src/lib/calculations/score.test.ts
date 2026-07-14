import { describe, expect, it } from "vitest";
import { calculateDialedScore, type DialedScoreInput } from ".";

const target = { doseGrams: 18, targetYieldGrams: 36, targetExtractionTimeSeconds: 30 };
const complete: DialedScoreInput = {
  doseGrams: 18,
  finalYieldGrams: 36,
  extractionSeconds: 30,
  overallTasteRating: 5,
  tasteBalance: "balanced",
  extractionPicture: "even",
  targetRecipe: target,
};

describe("Dialed Score 2.0.0-simple", () => {
  it("berechnet mit allen vereinfachten Kernfeldern einen vollständigen Score", () => {
    const result = calculateDialedScore(complete);
    expect(result.score).toBe(100);
    expect(result.complete).toBe(true);
    expect(result.coverage).toBe(100);
  });

  it("verwendet für Geschmack nur Rating und Balance", () => {
    const result = calculateDialedScore({ ...complete, overallTasteRating: 4 });
    expect(result.components.taste.score).toBe(87);
  });

  it("verwendet für Rezepttreue nur Ratio, Zeit und Dosis", () => {
    const exact = calculateDialedScore(complete).components.recipe.score;
    const changedTaste = calculateDialedScore({ ...complete, overallTasteRating: 1, tasteBalance: "bitter", extractionPicture: "channeling" }).components.recipe.score;
    expect(exact).toBe(100);
    expect(changedTaste).toBe(100);
  });

  it("mappt das Extraktionsbild auf die einfache Dreierauswahl", () => {
    expect(calculateDialedScore({ ...complete, extractionPicture: "even" }).components.extractionPicture.score).toBe(100);
    expect(calculateDialedScore({ ...complete, extractionPicture: "minor_channeling" }).components.extractionPicture.score).toBe(70);
    expect(calculateDialedScore({ ...complete, extractionPicture: "channeling" }).components.extractionPicture.score).toBe(25);
  });

  it("lässt fehlende Werte aus, statt sie als null Punkte zu werten", () => {
    const result = calculateDialedScore({ ...complete, extractionSeconds: null, extractionPicture: null });
    expect(result.components.recipe.score).toBe(100);
    expect(result.components.recipe.coverage).toBe(65);
    expect(result.components.extractionPicture.score).toBeNull();
  });

  it("erzeugt ohne Geschmack keinen vollständigen Gesamtscore", () => {
    const result = calculateDialedScore({ ...complete, overallTasteRating: null, tasteBalance: null });
    expect(result.score).toBeNull();
    expect(result.missingTasteEvaluation).toBe(true);
  });

  it("berechnet Konsistenz automatisch ab drei vergleichbaren Shots", () => {
    const previousComparableShots = [
      { doseGrams: 18, finalYieldGrams: 36, extractionSeconds: 30 },
      { doseGrams: 18.1, finalYieldGrams: 36.2, extractionSeconds: 29.8 },
      { doseGrams: 17.9, finalYieldGrams: 35.8, extractionSeconds: 30.2 },
    ];
    const result = calculateDialedScore({ ...complete, previousComparableShots });
    expect(result.components.consistency.score).toBeGreaterThanOrEqual(98);
  });

  it("ignoriert Legacy-Werte vollständig", () => {
    const withLegacy = { ...complete, pressureBar: 3, tampLevel: "slanted", astringencySeverity: 4, tds: 9 } as DialedScoreInput;
    expect(calculateDialedScore(withLegacy)).toEqual(calculateDialedScore(complete));
  });

  it("berechnet die Datenabdeckung nur aus sechs Kernfeldern", () => {
    expect(calculateDialedScore(complete).coverage).toBe(100);
    expect(calculateDialedScore({ doseGrams: 18, finalYieldGrams: 36, extractionSeconds: 30 }).coverage).toBe(50);
    expect(calculateDialedScore({ doseGrams: 18 }).coverageLabel).toBe("Geringe Aussagekraft");
  });
});
