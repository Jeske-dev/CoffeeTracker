import { describe, expect, it } from "vitest";
import type { RecommendationBundleRecord } from "@/types/domain";
import { resolveNextShotTargets } from "./next-shot-targets";

const latestShot = {
  dose_grams: 18,
  grind_setting: "5",
  stop_weight_grams: 34,
};

const recommendation = {
  target_recipe_snapshot: { doseGrams: 17.5, grindSetting: "5" },
  primary_action: {
    changes: [{ field: "grindSetting", previousValue: "5", recommendedValue: "4.5" }],
  },
  execution_adjustments: { recommendedStopWeightGrams: 33 },
} as unknown as RecommendationBundleRecord;

describe("resolveNextShotTargets", () => {
  it("begrenzt die Zielwerte auf Dosis, Mahlgrad und Stop-Gewicht", () => {
    expect(resolveNextShotTargets(recommendation, latestShot)).toEqual({
      doseGrams: 17.5,
      grindSetting: "4.5",
      stopWeightGrams: 33,
      changed: { dose: true, grind: true, stop: true },
    });
  });

  it("fällt ohne Empfehlung auf die Werte des letzten Shots zurück", () => {
    expect(resolveNextShotTargets(null, latestShot)).toEqual({
      doseGrams: 18,
      grindSetting: "5",
      stopWeightGrams: 34,
      changed: { dose: false, grind: false, stop: false },
    });
  });
});
