import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateRecommendation } from "./engine";
import { calculateOutcome } from "./outcome";
import { calculateSignals } from "./signals";
import { calculateStopWeight } from "./stop-weight";
import type { RecipeSnapshot, RecommendationInput, RecommendationShot } from "./types";

const target: RecipeSnapshot = {
  id: "recipe",
  doseGrams: 18,
  targetYieldGrams: 36,
  targetExtractionTimeSeconds: 30,
  grindSetting: "5",
  prepTools: ["WDT"],
};
const base: RecommendationShot = {
  id: "current",
  beanId: "bean",
  machineId: "machine",
  grinderId: "grinder",
  basketId: "basket",
  targetRecipeSnapshot: target,
  doseGrams: 18,
  finalYieldGrams: 36,
  stopWeightGrams: 34,
  extractionTimeSeconds: 25,
  grindSetting: "5",
  prepTools: [],
  overallTasteRating: 3,
  taste: "balanced",
  extractionPicture: "even",
  puck: "ideal",
};
const shot = (values: Partial<RecommendationShot> = {}): RecommendationShot => ({ ...base, ...values });
const recommend = (values: Partial<RecommendationShot> = {}, extra: Partial<Omit<RecommendationInput, "shot" | "history">> = {}) => generateRecommendation({
  shot: shot(values),
  history: [],
  generatedAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

describe("Recommendation Engine", () => {
  it("behält einen guten ausgewogenen Shot im Zeitfenster bei", () => {
    expect(recommend({ overallTasteRating: 4, taste: "balanced", extractionTimeSeconds: 25 }).primary.actionType).toBe("KEEP_RECIPE");
  });

  it("stellt unter 20 Sekunden unabhängig vom Geschmack um 0,33 feiner", () => {
    const result = recommend({ taste: null, overallTasteRating: null, extractionTimeSeconds: 19 });
    expect(result.primary.actionType).toBe("GRIND_FINER");
    expect(result.primary.changes[0]).toMatchObject({ previousValue: "5", recommendedValue: "5.33" });
  });

  it("stellt über 30 Sekunden unabhängig vom Geschmack um 0,33 gröber", () => {
    const result = recommend({ taste: "bitter", extractionTimeSeconds: 31 });
    expect(result.primary.actionType).toBe("GRIND_COARSER");
    expect(result.primary.changes[0]).toMatchObject({ previousValue: "5", recommendedValue: "4.67" });
  });

  it.each([20, 30])("ändert den Mahlgrad am Grenzwert %s Sekunden nicht", (extractionTimeSeconds) => {
    expect(recommend({ extractionTimeSeconds }).primary.actionType).not.toMatch(/^GRIND_/);
  });

  it("wendet die Zeitregel auch ohne Zielrezept an", () => {
    expect(recommend({ targetRecipeSnapshot: null, extractionTimeSeconds: 12 }).primary.actionType).toBe("GRIND_FINER");
  });

  it("ändert die Kaffeemenge nicht", () => {
    const result = recommend({ doseGrams: 20 });
    expect(result.primary.actionType).not.toMatch(/DOSE/);
    expect(result.primary.changes).not.toContainEqual(expect.objectContaining({ field: "doseGrams" }));
  });

  it("empfiehlt WDT bei starkem Channeling innerhalb des Zeitfensters", () => {
    expect(recommend({ extractionTimeSeconds: 25, extractionPicture: "channeling", prepTools: [] }).primary.actionType).toBe("USE_WDT");
  });

  it("empfiehlt bessere WDT-Verteilung bei starkem Channeling mit WDT", () => {
    expect(recommend({ extractionTimeSeconds: 25, extractionPicture: "channeling", prepTools: ["WDT"] }).primary.actionType).toBe("IMPROVE_WDT");
  });

  it("priorisiert die eindeutige Zeitregel auch bei Channeling", () => {
    expect(recommend({ extractionTimeSeconds: 19, extractionPicture: "channeling" }).primary.actionType).toBe("GRIND_FINER");
  });

  it("erkennt wiederholtes leichtes Channeling in zwei der letzten drei Shots", () => {
    const history = [
      shot({ id: "a", extractionPicture: "minor_channeling" }),
      shot({ id: "b", extractionPicture: "minor_channeling" }),
      shot({ id: "c", extractionPicture: "even" }),
    ];
    const result = generateRecommendation({ shot: base, history });
    expect(result.primary.actionType).toBe("USE_WDT");
    expect(result.primary.confidence).toBeLessThan(0.75);
  });

  it("beachtet die konfigurierten Grenzen der Mühle", () => {
    const result = recommend({ grindSetting: "10", extractionTimeSeconds: 10 }, {
      grinder: { grindScaleType: "stepped", minimumSetting: 0, maximumSetting: 10.2, microStep: 1, finerDirection: "lower", displayUnit: "Klick" },
    });
    expect(result.primary.changes[0].recommendedValue).toBe("10.2");
  });

  it("liest entfernte Legacy-Felder nicht", () => {
    const legacyShot = { ...base, tampLevel: "slanted", pressureBar: 2, astringencySeverity: 4, sprayingSeverity: 4 } as RecommendationShot;
    expect(generateRecommendation({ shot: legacyShot, history: [] }).primary.actionType).toBe(generateRecommendation({ shot: base, history: [] }).primary.actionType);
  });

  it("berechnet Ratio, Nachlauf und das feste Zeitfenster", () => {
    const signals = calculateSignals(base);
    expect(signals.brewRatio).toBe(2);
    expect(signals.actualOvershoot).toBe(2);
    expect(signals.timeNearTarget).toBe(true);
    expect(calculateSignals(shot({ extractionTimeSeconds: 19 })).fastShot).toBe(true);
    expect(calculateSignals(shot({ extractionTimeSeconds: 31 })).slowShot).toBe(true);
  });
});

describe("Stop-Gewicht", () => {
  it("verwendet den durchschnittlichen Nachlauf gleicher Bohne und gleichen Mahlgrads", () => {
    const history = [1, 3].map((overshoot, index) => shot({ id: `${index}`, stopWeightGrams: 36 - overshoot }));
    expect(calculateStopWeight(base, history, 36)?.recommendedStopWeightGrams).toBe(34);
  });

  it("ignoriert beim direkten Durchschnitt andere Bohnen und Mahlgrade", () => {
    const history = [
      shot({ id: "same", stopWeightGrams: 33 }),
      shot({ id: "other-bean", beanId: "other", stopWeightGrams: 25 }),
      shot({ id: "other-grind", grindSetting: "6", stopWeightGrams: 25 }),
    ];
    expect(calculateStopWeight(base, history, 36)?.expectedOvershootGrams).toBe(2.5);
  });

  it("entfernt einen starken Nachlauf-Ausreißer", () => {
    const history = [2.1, 1.9, 2.05, 10].map((overshoot, index) => shot({ id: `${index}`, stopWeightGrams: 36 - overshoot }));
    expect(calculateStopWeight(base, history, 36)?.expectedOvershootGrams).toBe(2);
  });

  it("rechnet ohne passenden Mahlgrad den Nachlauf per Dreisatz um", () => {
    const result = calculateStopWeight(base, [], 45, "5.33");
    expect(result?.recommendedStopWeightGrams).toBe(42.5);
    expect(result?.expectedOvershootGrams).toBe(2.5);
  });
});

describe("Lifecycle und Migration", () => {
  it("wertet Outcomes aus verfügbaren Teilwerten aus", () => {
    expect(calculateOutcome({ previousSensoryScore: 0.4, newSensoryScore: 0.7 }).value).toBeCloseTo(0.3);
  });

  it("markiert Outcomes nach mehreren manuellen Änderungen als mehrdeutig", () => {
    expect(calculateOutcome({ previousSensoryScore: 0.4, newSensoryScore: 0.8, manualAdditionalChangeCount: 2 }).status).toBe("ambiguous");
  });

  it("behält RLS und Idempotenz der Recommendation-Tabelle", () => {
    const sql = readFileSync("supabase/migrations/20260713030000_recommendation_engine.sql", "utf8");
    expect(sql).toContain("recommendation_bundles enable row level security");
    expect(sql).toContain("auth.uid()) = user_id");
    expect(sql).toContain("unique (source_shot_id, engine_version)");
  });

  it("erhält Legacy-Spalten und ergänzt Score-Version 2", () => {
    const sql = readFileSync("supabase/migrations/20260713060000_simple_shot_scoring.sql", "utf8");
    expect(sql).toContain("add column if not exists scoring_version");
    for (const column of ["grind_setting", "extraction_seconds", "stop_weight_grams", "taste", "flow", "puck", "score"]) {
      expect(sql).toContain(`alter column ${column} drop not null`);
    }
    expect(sql).not.toMatch(/drop column/i);
  });
});
