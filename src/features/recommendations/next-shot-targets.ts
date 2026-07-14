import type { RecommendationBundleRecord, ShotSummary } from "@/types/domain";
import type { ExecutionAdjustment, RecipeSnapshot, RecommendationCandidate } from "./types";

export type NextShotTargets = {
  doseGrams: number | null;
  grindSetting: string | null;
  stopWeightGrams: number | null;
  changed: {
    dose: boolean;
    grind: boolean;
    stop: boolean;
  };
};

export function resolveNextShotTargets(
  recommendation: RecommendationBundleRecord | null,
  latestShot: Pick<ShotSummary, "dose_grams" | "grind_setting" | "stop_weight_grams"> | null | undefined,
): NextShotTargets {
  const recipe = recommendation?.target_recipe_snapshot as unknown as RecipeSnapshot | null;
  const primary = recommendation?.primary_action as unknown as RecommendationCandidate | null;
  const execution = recommendation?.execution_adjustments as unknown as ExecutionAdjustment | null;
  const changes = primary?.changes ?? [];
  const doseChange = changes.find((change) => change.field === "doseGrams")?.recommendedValue;
  const grindChange = changes.find((change) => change.field === "grindSetting")?.recommendedValue;
  const doseGrams = finiteNumber(doseChange) ?? finiteNumber(recipe?.doseGrams) ?? latestShot?.dose_grams ?? null;
  const grindSetting = stringValue(grindChange) ?? stringValue(recipe?.grindSetting) ?? latestShot?.grind_setting ?? null;
  const stopWeightGrams = finiteNumber(execution?.recommendedStopWeightGrams) ?? latestShot?.stop_weight_grams ?? null;

  return {
    doseGrams,
    grindSetting,
    stopWeightGrams,
    changed: {
      dose: doseGrams !== null && doseGrams !== latestShot?.dose_grams,
      grind: grindSetting !== null && grindSetting !== latestShot?.grind_setting,
      stop: stopWeightGrams !== null && stopWeightGrams !== latestShot?.stop_weight_grams,
    },
  };
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
