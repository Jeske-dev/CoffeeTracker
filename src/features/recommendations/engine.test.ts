import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyRecommendationToDefaults } from "./apply";
import { generateRecommendation } from "./engine";
import { normalizedFineness } from "./grind-sensitivity";
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
  extractionTimeSeconds: 30,
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

describe("vereinfachte Recommendation Engine", () => {
  it("empfiehlt für einen guten ausgewogenen Shot Beibehalten", () => {
    expect(recommend({ overallTasteRating: 4, taste: "balanced", extractionTimeSeconds: 44 }).primary.actionType).toBe("KEEP_RECIPE");
  });

  it("empfiehlt bei sauer und schnell feiner", () => {
    expect(recommend({ taste: "sour", extractionTimeSeconds: 22 }).primary.actionType).toBe("GRIND_FINER");
  });

  it("empfiehlt bei bitter und langsam gröber", () => {
    expect(recommend({ taste: "bitter", extractionTimeSeconds: 40 }).primary.actionType).toBe("GRIND_COARSER");
  });

  it("erhöht bei saurem Geschmack und passender Zeit den Yield", () => {
    const result = recommend({ taste: "sour", extractionTimeSeconds: 30 });
    expect(result.primary.actionType).toBe("INCREASE_YIELD");
    expect(result.primary.changes[0].recommendedValue).toBe(38);
  });

  it("reduziert bei bitterem Geschmack und passender Zeit den Yield", () => {
    const result = recommend({ taste: "bitter", extractionTimeSeconds: 30 });
    expect(result.primary.actionType).toBe("DECREASE_YIELD");
    expect(result.primary.changes[0].recommendedValue).toBe(34);
  });

  it("empfiehlt WDT bei starkem Channeling ohne WDT", () => {
    expect(recommend({ extractionPicture: "channeling", prepTools: [] }).primary.actionType).toBe("USE_WDT");
  });

  it("empfiehlt bessere WDT-Verteilung bei starkem Channeling mit WDT", () => {
    expect(recommend({ extractionPicture: "channeling", prepTools: ["WDT"] }).primary.actionType).toBe("IMPROVE_WDT");
  });

  it("lässt Channeling eine Mahlgradänderung unterdrücken", () => {
    expect(recommend({ taste: "sour", extractionTimeSeconds: 20, extractionPicture: "channeling" }).primary.actionType).toBe("USE_WDT");
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

  it("kennzeichnet technische Tipps ohne Geschmack mit niedriger Sicherheit", () => {
    const technical = recommend({ overallTasteRating: null, taste: null, extractionTimeSeconds: 20 });
    const sensory = recommend({ taste: "sour", extractionTimeSeconds: 20 });
    expect(technical.primary.actionType).toBe("GRIND_FINER");
    expect(technical.primary.confidence).toBeLessThan(sensory.primary.confidence);
  });

  it("erfindet ohne Zielrezept keinen Mahlgrad-Tipp", () => {
    expect(recommend({ targetRecipeSnapshot: null, taste: "sour", extractionTimeSeconds: 12 }).primary.actionType).toBe("COLLECT_MORE_DATA");
  });

  it("ändert die Dosis nur bei verletzter Siebkapazität", () => {
    const result = recommend({ doseGrams: 20 }, { basket: { nominalDoseGrams: 18, minimumDoseGrams: 17, maximumDoseGrams: 19 } });
    expect(result.primary.actionType).toBe("DECREASE_DOSE");
    expect(result.primary.changes[0].recommendedValue).toBe(19.5);
  });

  it("erzeugt bei einem nassen Puck allein keine Dosisänderung", () => {
    expect(recommend({ puck: "wet" }).primary.actionType).not.toMatch(/DOSE/);
  });

  it("begrenzt Mahlgradänderungen auf zwei Micro-Steps", () => {
    const result = recommend({ taste: "sour", extractionTimeSeconds: 10 }, {
      grinder: { grindScaleType: "stepped", minimumSetting: 0, maximumSetting: 20, microStep: 1, finerDirection: "higher", displayUnit: "Klick" },
    });
    expect(result.primary.changes[0].recommendedValue).toBe("7");
  });

  it("berücksichtigt umgekehrte Mühlenskalen", () => {
    expect(normalizedFineness("4.2", { grindScaleType: "stepless", minimumSetting: 0, maximumSetting: 10, microStep: 0.1, finerDirection: "lower" })).toBe(-4.2);
  });

  it("liest entfernte Legacy-Felder nicht", () => {
    const legacyShot = { ...base, tampLevel: "slanted", pressureBar: 2, astringencySeverity: 4, sprayingSeverity: 4 } as RecommendationShot;
    expect(generateRecommendation({ shot: legacyShot, history: [] }).primary.actionType).toBe(generateRecommendation({ shot: base, history: [] }).primary.actionType);
  });

  it("berechnet Ratio, Nachlauf und Zeitschwelle", () => {
    const signals = calculateSignals(base, target);
    expect(signals.brewRatio).toBe(2);
    expect(signals.actualOvershoot).toBe(2);
    expect(signals.timeThreshold).toBeCloseTo(3.6);
  });
});

describe("Stop-Gewicht", () => {
  it("verwendet den Median der letzten Shots derselben Maschine", () => {
    const history = [2, 1.8, 2.2].map((overshoot, index) => shot({ id: `${index}`, stopWeightGrams: 36 - overshoot }));
    expect(calculateStopWeight(base, history, 36)?.recommendedStopWeightGrams).toBe(34);
  });

  it("ignoriert Shots anderer Maschinen", () => {
    const history = [shot({ id: "same", stopWeightGrams: 34 }), shot({ id: "other", machineId: "other", stopWeightGrams: 20 })];
    expect(calculateStopWeight(base, history, 36)?.expectedOvershootGrams).toBe(2);
  });

  it("entfernt einen starken Nachlauf-Ausreißer", () => {
    const history = [2, 2.1, 1.9, 2.05, 15].map((overshoot, index) => shot({ id: `${index}`, stopWeightGrams: 36 - overshoot }));
    expect(calculateStopWeight(base, history, 36)?.expectedOvershootGrams).toBe(2);
  });
});

describe("Anwendung, Lifecycle und Migration", () => {
  const bundle = recommend({ taste: "sour", extractionTimeSeconds: 20 }, {
    grinder: { grindScaleType: "stepped", minimumSetting: 0, maximumSetting: 20, microStep: 1, finerDirection: "higher" },
  });

  it("übernimmt genau ein empfohlenes Feld", () => {
    const applied = applyRecommendationToDefaults({ grindSetting: "5", doseGrams: 18, prepTools: [], stopWeightGrams: 34, finalYieldGrams: 36 }, bundle);
    expect(applied.values.grindSetting).toBe("7");
    expect(applied.recommendedFields).toEqual(["grindSetting"]);
    expect(applied.values.stopWeightGrams).toBe(34);
  });

  it("lässt alle nicht empfohlenen Felder unverändert", () => {
    const applied = applyRecommendationToDefaults({ grindSetting: "5", doseGrams: 18, prepTools: ["Puck Screen"], stopWeightGrams: 34, finalYieldGrams: 36 }, bundle);
    expect(applied.values.doseGrams).toBe(18);
    expect(applied.values.prepTools).toEqual(["Puck Screen"]);
    expect(applied.values.finalYieldGrams).toBe(36);
  });

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
