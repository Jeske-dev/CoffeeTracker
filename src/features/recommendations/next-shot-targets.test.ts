import { describe, expect, it } from "vitest";
import type { ShotSummary } from "@/types/domain";
import { resolveNextShotTargets } from "./next-shot-targets";

const shot = (overrides: Partial<ShotSummary> = {}): ShotSummary => ({
  id: "latest",
  bean_id: "bean-1",
  machine_id: null,
  grinder_id: null,
  basket_id: null,
  shot_at: "2026-07-15T08:00:00Z",
  dose_grams: 18,
  grind_setting: "5",
  extraction_seconds: 25,
  stop_weight_grams: 34,
  final_yield_grams: 36,
  taste: "balanced",
  flow: "even",
  score: null,
  score_coverage: null,
  target_recipe_snapshot: null,
  scoring_version: null,
  beans: null,
  ...overrides,
});

describe("resolveNextShotTargets", () => {
  it("behält die Kaffeemenge bei und stellt einen schnellen Shot feiner", () => {
    expect(resolveNextShotTargets(shot({ extraction_seconds: 19 }))).toEqual({
      doseGrams: 18,
      grindSetting: "5.33",
      stopWeightGrams: 34,
      changed: { dose: false, grind: true, stop: false },
    });
  });

  it("stellt einen langsamen Shot gröber", () => {
    expect(resolveNextShotTargets(shot({ extraction_seconds: 31 })).grindSetting).toBe("4.67");
  });

  it.each([20, 30])("behält den Mahlgrad bei %s Sekunden bei", (extraction_seconds) => {
    const targets = resolveNextShotTargets(shot({ extraction_seconds }));
    expect(targets.grindSetting).toBe("5");
    expect(targets.changed.grind).toBe(false);
  });

  it("nutzt den Durchschnitt der letzten Shots mit gleicher Bohne und gleichem Mahlgrad", () => {
    const latest = shot();
    const history = [
      latest,
      shot({ id: "older-1", stop_weight_grams: 33 }),
      shot({ id: "older-2", stop_weight_grams: 32 }),
      shot({ id: "other-bean", bean_id: "bean-2", stop_weight_grams: 20 }),
    ];
    const targets = resolveNextShotTargets(latest, history);
    expect(targets.stopWeightGrams).toBe(33);
    expect(targets.changed.stop).toBe(true);
  });

  it("rechnet ohne passenden Zielmahlgrad den Nachlauf proportional um", () => {
    const latest = shot({ extraction_seconds: 18, final_yield_grams: 45, stop_weight_grams: null });
    const history = [shot({ id: "older", grind_setting: "4", final_yield_grams: 36, stop_weight_grams: 34 })];
    expect(resolveNextShotTargets(latest, history).stopWeightGrams).toBe(42.5);
  });

  it("liefert ohne bisherigen Shot leere Zielwerte", () => {
    expect(resolveNextShotTargets(null)).toEqual({
      doseGrams: null,
      grindSetting: null,
      stopWeightGrams: null,
      changed: { dose: false, grind: false, stop: false },
    });
  });
});
