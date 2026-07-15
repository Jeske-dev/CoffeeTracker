import type { Shot } from "@/types/domain";
import { estimateStopWeight } from "./stop-weight-estimate";

export type StopWeightHistoryShot = Pick<Shot,
  "id" | "bean_id" | "grind_setting" | "stop_weight_grams" | "final_yield_grams" | "shot_at"
>;

export type StopWeightTip = {
  recommendedStopWeightGrams: number;
  expectedOvershootGrams: number;
  targetFinalWeightGrams: number;
  sampleSize: number;
  source: "matching_history" | "scaled_history" | "rule_of_three";
};

export function calculateStopWeightTip({
  beanId,
  grindSetting,
  targetFinalWeightGrams,
  history,
}: {
  beanId: string | null;
  grindSetting: string | null;
  targetFinalWeightGrams: number | null | undefined;
  history: readonly StopWeightHistoryShot[];
}): StopWeightTip | null {
  return estimateStopWeight({
    beanId,
    grindSetting,
    targetFinalWeightGrams: targetFinalWeightGrams ?? null,
    history: history.map((shot) => ({
      id: shot.id,
      beanId: shot.bean_id,
      grindSetting: shot.grind_setting,
      stopWeightGrams: shot.stop_weight_grams,
      finalWeightGrams: shot.final_yield_grams,
      occurredAt: shot.shot_at,
    })),
  });
}
