import type { RecommendationBundle, RecommendationChange } from "./types";

export type NextShotDefaults = {
  grindSetting: string | null; doseGrams: number | null; temperatureC: number | null;
  prepTools: string[] | null; stopWeightGrams: number | null; finalYieldGrams: number | null;
  [key: string]: unknown;
};

const formField: Record<string, string> = {
  targetYieldGrams: "finalYieldGrams",
  temperatureCelsius: "temperatureC",
};

export function applyRecommendationToDefaults<T extends NextShotDefaults>(defaults: T, bundle: RecommendationBundle) {
  const values: Record<string, unknown> = { ...defaults };
  const originals: Record<string, unknown> = {};
  const appliedChanges: RecommendationChange[] = [];
  for (const change of bundle.primary.changes) {
    const field = formField[change.field] ?? change.field;
    if (!(field in values)) continue;
    originals[field] = values[field] ?? change.previousValue;
    values[field] = change.recommendedValue;
    appliedChanges.push(change);
  }
  if (bundle.executionAdjustment) {
    originals.stopWeightGrams = values.stopWeightGrams;
    values.stopWeightGrams = bundle.executionAdjustment.recommendedStopWeightGrams;
  }
  return { values: values as T, originals, appliedChanges, recommendedFields: Object.keys(originals) };
}
