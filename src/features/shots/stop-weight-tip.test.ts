import { describe, expect, it } from "vitest";
import { calculateStopWeightTip, type StopWeightHistoryShot } from "./stop-weight-tip";

const historyShot = (overrides: Partial<StopWeightHistoryShot> = {}): StopWeightHistoryShot => ({
  id: "shot-1",
  bean_id: "bean-1",
  grind_setting: "5",
  stop_weight_grams: 34,
  final_yield_grams: 36,
  shot_at: "2026-07-13T08:00:00Z",
  ...overrides,
});

describe("calculateStopWeightTip", () => {
  it("nutzt den durchschnittlichen Nachlauf gleicher Bohne und gleichen Mahlgrads", () => {
    const result = calculateStopWeightTip({
      beanId: "bean-1",
      grindSetting: "5,0",
      targetFinalWeightGrams: 40,
      history: [
        historyShot({ id: "shot-1", stop_weight_grams: 34, final_yield_grams: 36 }),
        historyShot({ id: "shot-2", stop_weight_grams: 35.8, final_yield_grams: 38 }),
        historyShot({ id: "shot-3", stop_weight_grams: 39.2, final_yield_grams: 41 }),
        historyShot({ id: "other-bean", bean_id: "bean-2", stop_weight_grams: 30, final_yield_grams: 36 }),
      ],
    });

    expect(result).toEqual({
      recommendedStopWeightGrams: 38,
      expectedOvershootGrams: 2,
      targetFinalWeightGrams: 40,
      sampleSize: 3,
      source: "matching_history",
    });
  });

  it("filtert deutliche Ausreißer aus mehreren passenden Shots", () => {
    const result = calculateStopWeightTip({
      beanId: "bean-1",
      grindSetting: "5",
      targetFinalWeightGrams: 36,
      history: [
        historyShot({ id: "shot-1", stop_weight_grams: 34, final_yield_grams: 36 }),
        historyShot({ id: "shot-2", stop_weight_grams: 33.9, final_yield_grams: 36 }),
        historyShot({ id: "shot-3", stop_weight_grams: 34.1, final_yield_grams: 36 }),
        historyShot({ id: "shot-4", stop_weight_grams: 26, final_yield_grams: 36 }),
      ],
    });

    expect(result?.expectedOvershootGrams).toBe(2);
    expect(result?.sampleSize).toBe(3);
  });

  it("rechnet den Nachlauf ähnlicher Shots proportional auf das Zielgewicht um", () => {
    const result = calculateStopWeightTip({
      beanId: "bean-1",
      grindSetting: "6",
      targetFinalWeightGrams: 45,
      history: [
        historyShot({ bean_id: "bean-1", grind_setting: "4", stop_weight_grams: 34, final_yield_grams: 36 }),
        historyShot({ id: "unrelated-1", bean_id: "bean-2", stop_weight_grams: 30, final_yield_grams: 36 }),
        historyShot({ id: "unrelated-2", bean_id: "bean-3", stop_weight_grams: 30, final_yield_grams: 36 }),
      ],
    });

    expect(result).toEqual({
      recommendedStopWeightGrams: 42.5,
      expectedOvershootGrams: 2.5,
      targetFinalWeightGrams: 45,
      sampleSize: 1,
      source: "scaled_history",
    });
  });

  it("liefert ohne Historie den transparenten Dreisatz-Startwert", () => {
    expect(calculateStopWeightTip({
      beanId: "bean-1",
      grindSetting: null,
      targetFinalWeightGrams: 36,
      history: [],
    })).toEqual({
      recommendedStopWeightGrams: 34,
      expectedOvershootGrams: 2,
      targetFinalWeightGrams: 36,
      sampleSize: 0,
      source: "rule_of_three",
    });
  });

  it("zeigt ohne valides finales Zielgewicht keinen Tipp", () => {
    expect(calculateStopWeightTip({
      beanId: "bean-1",
      grindSetting: "5",
      targetFinalWeightGrams: null,
      history: [historyShot()],
    })).toBeNull();
  });
});
