import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyRecommendationToDefaults } from "./apply";
import { generateRecommendation } from "./engine";
import { normalizedFineness } from "./grind-sensitivity";
import { calculateOutcome } from "./outcome";
import { applyRepetitionPolicy } from "./repository";
import { calculateSignals } from "./signals";
import { calculateStopWeight } from "./stop-weight";
import type { RecipeSnapshot, RecommendationShot } from "./types";

const target: RecipeSnapshot = { id: "recipe", doseGrams: 18, targetYieldGrams: 36, targetExtractionTimeSeconds: 30, temperatureCelsius: 93, grindSetting: "5", prepTools: ["Tamper"] };
const base: RecommendationShot = {
  id: "current", beanId: "bean", machineId: "machine", grinderId: "grinder", basketId: "basket", targetRecipeSnapshot: target,
  doseGrams: 18, finalYieldGrams: 36, stopWeightGrams: 34, extractionTimeSeconds: 30, firstDropTimeSeconds: 7,
  temperatureCelsius: 93, grindSetting: "5", prepTools: ["Tamper"], overallTasteRating: 3, tasteBalance: 0,
  astringencySeverity: 0, channelingSeverity: 0, sprayingSeverity: 0, flowEvenness: 5, puckDamageSeverity: 0,
  showerScreenImprint: false, puckScreenImprint: false, puckWet: false, puckStuck: false, strengthPerception: 0,
  tampLevel: "level", experimentMode: false,
};
const shot = (values: Partial<RecommendationShot> = {}) => ({ ...base, ...values });
const recommend = (values: Partial<RecommendationShot> = {}, extra: Record<string, unknown> = {}) => generateRecommendation({ shot: shot(values), history: [], generatedAt: "2026-01-01T00:00:00.000Z", ...extra });

describe("recommendation rules", () => {
  it("1: recommends finer for a sour fast shot", () => expect(recommend({ tasteBalance: -1, extractionTimeSeconds: 22 }).primary.actionType).toBe("GRIND_FINER"));
  it("2: recommends coarser for a bitter slow shot", () => expect(recommend({ tasteBalance: 1, extractionTimeSeconds: 40 }).primary.actionType).toBe("GRIND_COARSER"));
  it("3: increases yield for sour taste near target", () => expect(recommend({ tasteBalance: -1 }).primary.actionType).toBe("INCREASE_YIELD"));
  it("4: decreases yield for bitter taste near target", () => expect(recommend({ tasteBalance: 1 }).primary.actionType).toBe("DECREASE_YIELD"));
  it("5: keeps an excellent unusual shot", () => expect(recommend({ overallTasteRating: 5, tasteBalance: 0, extractionTimeSeconds: 42 }).primary.actionType).toBe("KEEP_RECIPE"));
  it("6: recommends WDT for severe channeling without it", () => expect(recommend({ channelingSeverity: 4 }).primary.actionType).toBe("USE_WDT"));
  it("7: improves distribution when WDT was already used", () => expect(recommend({ channelingSeverity: 4, prepTools: ["WDT", "Tamper"] }).primary.actionType).toBe("IMPROVE_DISTRIBUTION"));
  it("8: lets channeling suppress a grind adjustment", () => expect(recommend({ tasteBalance: -2, extractionTimeSeconds: 20, channelingSeverity: 4 }).primary.actionType).toBe("USE_WDT"));
  it("9: prioritizes a level tamp when slanted", () => expect(recommend({ channelingSeverity: 4, tampLevel: "slanted" }).primary.actionType).toBe("LEVEL_TAMP"));
  it("10: does not change dose for a wet puck alone", () => expect(recommend({ puckWet: true }).primary.actionType).not.toMatch(/DOSE/));
  it("11: reduces dose by 0.5 g for a shower imprint", () => {
    const result = recommend({ showerScreenImprint: true });
    expect(result.primary.actionType).toBe("DECREASE_DOSE"); expect(result.primary.changes[0].recommendedValue).toBe(17.5);
  });
  it("12: changes temperature only after a repeated problem and yield test", () => {
    const history = [shot({ id: "a", tasteBalance: -1 }), shot({ id: "b", tasteBalance: -1 })];
    const result = generateRecommendation({ shot: shot({ tasteBalance: -1 }), history, machine: { temperatureAdjustable: true, minimumTemperature: 85, maximumTemperature: 100 }, yieldAdjustmentTested: true });
    expect(result.primary.actionType).toBe("INCREASE_TEMPERATURE");
  });
  it("13: gives a less certain technical recommendation without taste", () => {
    const technical = recommend({ overallTasteRating: null, tasteBalance: null, strengthPerception: null, astringencySeverity: null, extractionTimeSeconds: 20 });
    const sensory = recommend({ tasteBalance: -1, extractionTimeSeconds: 20 });
    expect(technical.primary.actionType).toBe("GRIND_FINER"); expect(technical.primary.confidence).toBeLessThan(sensory.primary.confidence);
  });
  it("14: invents no grind rule without a target recipe", () => expect(recommend({ targetRecipeSnapshot: null, tasteBalance: -2, extractionTimeSeconds: 12 }).primary.actionType).toBe("COLLECT_MORE_DATA"));
  it("15: treats exact strength and no rating as a lower-confidence positive signal", () => expect(recommend({ overallTasteRating: null, tasteBalance: null, strengthPerception: 0 }).primary.actionType).toBe("KEEP_RECIPE"));
  it("16: normalizes reversed grinder scales", () => expect(normalizedFineness("4.2", { grindScaleType: "stepless", minimumSetting: 0, maximumSetting: 10, microStep: 0.1, finerDirection: "lower" })).toBe(-4.2));
  it("17: caps grind changes at two micro steps", () => {
    const result = recommend({ tasteBalance: -2, extractionTimeSeconds: 10 }, { grinder: { grindScaleType: "stepped", minimumSetting: 0, maximumSetting: 20, microStep: 1, finerDirection: "higher", displayUnit: "Klick" } });
    expect(result.primary.changes[0].recommendedValue).toBe("7");
  });
  it("derives ratio, overshoot, and guarded average flow", () => {
    const signals = calculateSignals(base, target);
    expect(signals.brewRatio).toBe(2); expect(signals.actualOvershoot).toBe(2); expect(signals.averageFlow).toBeCloseTo(36 / 23);
    expect(calculateSignals(shot({ firstDropTimeSeconds: 31 }), target).averageFlow).toBeNull();
  });
});

describe("stop weight", () => {
  it("18: uses the machine median", () => {
    const history = [2, 1.8, 2.2].map((over, i) => shot({ id: `${i}`, stopWeightGrams: 36 - over }));
    expect(calculateStopWeight(base, history, 36)?.recommendedStopWeightGrams).toBe(34);
  });
  it("19: removes a strong overshoot outlier", () => {
    const history = [2, 2.1, 1.9, 2.05, 15].map((over, i) => shot({ id: `${i}`, stopWeightGrams: 36 - over }));
    expect(calculateStopWeight(base, history, 36)?.expectedOvershootGrams).toBe(2);
  });
  it("20: marks one sample as low confidence", () => expect(calculateStopWeight(base, [shot({ id: "one" })], 36)?.confidence).toBe(0.35));
});

describe("application, lifecycle, and security", () => {
  const bundle = recommend({ tasteBalance: -1, extractionTimeSeconds: 20 }, { grinder: { grindScaleType: "stepped", minimumSetting: 0, maximumSetting: 20, microStep: 1, finerDirection: "higher" } });
  it("21: applies recommended values to next-shot defaults", () => expect(applyRecommendationToDefaults({ grindSetting: "5", doseGrams: 18, temperatureC: 93, prepTools: ["Tamper"], stopWeightGrams: 34, finalYieldGrams: 36 }, bundle).values.grindSetting).toBe("7"));
  it("22: leaves all non-recommended fields untouched", () => {
    const applied = applyRecommendationToDefaults({ grindSetting: "5", doseGrams: 18, temperatureC: 93, prepTools: ["Tamper"], stopWeightGrams: 34, finalYieldGrams: 36 }, bundle);
    expect(applied.values.doseGrams).toBe(18); expect(applied.values.temperatureC).toBe(93);
  });
  it("23: suppresses an immediately repeated dismissed recommendation", () => {
    const previous = [{ bean_id: "bean", status: "dismissed", primary_action: { actionType: bundle.primary.actionType } }] as never;
    expect(applyRepetitionPolicy(structuredClone(bundle), previous, { beanId: "bean" }).suppressActive).toBe(true);
  });
  it("24: changes repeated wording after two identical recommendations", () => {
    const previous = [1, 2].map(() => ({ bean_id: "bean", status: "completed", primary_action: { actionType: bundle.primary.actionType } })) as never;
    expect(applyRepetitionPolicy(structuredClone(bundle), previous, { beanId: "bean" }).bundle.primary.title).toContain("Gezieltes Experiment");
  });
  it("25: calculates an outcome from available partial scores", () => expect(calculateOutcome({ previousSensoryScore: 2, newSensoryScore: 4 }).value).toBe(2));
  it("26: marks outcomes ambiguous after multiple manual changes", () => expect(calculateOutcome({ previousSensoryScore: 2, newSensoryScore: 5, manualAdditionalChangeCount: 2 }).status).toBe("ambiguous"));
  it("27: migration enables RLS and own-user policies", () => {
    const sql = readFileSync("supabase/migrations/20260713030000_recommendation_engine.sql", "utf8");
    expect(sql).toContain("recommendation_bundles enable row level security"); expect(sql).toContain("auth.uid()) = user_id");
  });
  it("28: migration enforces idempotency per source shot and engine", () => {
    const sql = readFileSync("supabase/migrations/20260713030000_recommendation_engine.sql", "utf8");
    expect(sql).toContain("unique (source_shot_id, engine_version)");
  });
});
