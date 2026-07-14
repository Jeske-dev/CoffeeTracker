import type { RecommendationBundleRecord, ShotSummary } from "@/types/domain";

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
  const recipe = asRecord(recommendation?.target_recipe_snapshot);
  const execution = asRecord(recommendation?.execution_adjustments);
  const doseGrams = finiteNumber(recommendedValue(recommendation, "doseGrams")) ?? finiteNumber(recipe?.doseGrams) ?? latestShot?.dose_grams ?? null;
  const grindSetting = stringValue(recommendedValue(recommendation, "grindSetting")) ?? stringValue(recipe?.grindSetting) ?? latestShot?.grind_setting ?? null;
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

function recommendedValue(recommendation: RecommendationBundleRecord | null, field: string) {
  const primary = asRecord(recommendation?.primary_action);
  if (!Array.isArray(primary?.changes)) return null;
  const change = primary.changes.map(asRecord).find((item) => item?.field === field);
  return change?.recommendedValue ?? null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
