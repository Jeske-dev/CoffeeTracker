import { median } from "@/lib/statistics";
import type { Shot } from "@/types/domain";

const MAX_MATCHING_SHOTS = 10;
const MAX_SCALED_SHOTS = 5;
const MAX_OVERSHOOT_SHARE = 0.3;
const DEFAULT_STOP_TO_FINAL_RATIO = 34 / 36;

export type StopWeightHistoryShot = Pick<Shot,
  "id" | "bean_id" | "grinder_id" | "grind_setting" | "stop_weight_grams" | "final_yield_grams" | "shot_at"
>;

export type StopWeightTip = {
  recommendedStopWeightGrams: number;
  expectedOvershootGrams: number;
  targetFinalWeightGrams: number;
  sampleSize: number;
  source: "matching_history" | "scaled_history" | "rule_of_three";
};

type StopMeasurement = {
  beanId: string;
  grinderId: string | null;
  grindKey: string | null;
  finalWeightGrams: number;
  overshootGrams: number;
  shotAt: string;
};

export function calculateStopWeightTip({
  beanId,
  grinderId,
  grindSetting,
  targetFinalWeightGrams,
  history,
}: {
  beanId: string | null;
  grinderId: string | null;
  grindSetting: string | null;
  targetFinalWeightGrams: number | null | undefined;
  history: readonly StopWeightHistoryShot[];
}): StopWeightTip | null {
  const targetWeight = finitePositiveNumber(targetFinalWeightGrams);
  if (targetWeight === null) return null;

  const grindKey = normalizeGrindSetting(grindSetting);
  const measurements = history
    .flatMap((shot) => toMeasurement(shot))
    .sort((a, b) => Date.parse(b.shotAt) - Date.parse(a.shotAt));
  const matching = measurements
    .filter((shot) => beanId !== null
      && grindKey !== null
      && shot.beanId === beanId
      && shot.grinderId === grinderId
      && shot.grindKey === grindKey)
    .slice(0, MAX_MATCHING_SHOTS);

  if (matching.length) {
    const result = robustMedian(matching.map((shot) => shot.overshootGrams));
    return buildTip(targetWeight, result.value, result.sampleSize, "matching_history");
  }

  const scoredMeasurements = measurements.map((shot) => ({
    shot,
    score: similarityScore(shot, beanId, grinderId, grindKey),
  }));
  const highestScore = Math.max(...scoredMeasurements.map(({ score }) => score));
  const comparable = scoredMeasurements
    .filter(({ score }) => score === highestScore)
    .map(({ shot }) => shot)
    .slice(0, MAX_SCALED_SHOTS);

  if (comparable.length) {
    const result = robustMedian(comparable.map((shot) => shot.overshootGrams / shot.finalWeightGrams));
    return buildTip(targetWeight, targetWeight * result.value, result.sampleSize, "scaled_history");
  }

  return buildTip(targetWeight, targetWeight * (1 - DEFAULT_STOP_TO_FINAL_RATIO), 0, "rule_of_three");
}

function toMeasurement(shot: StopWeightHistoryShot): StopMeasurement[] {
  const stopWeight = finitePositiveNumber(shot.stop_weight_grams, true);
  const finalWeight = finitePositiveNumber(shot.final_yield_grams);
  if (stopWeight === null || finalWeight === null) return [];
  const overshoot = finalWeight - stopWeight;
  if (overshoot < 0 || overshoot / finalWeight > MAX_OVERSHOOT_SHARE) return [];
  return [{
    beanId: shot.bean_id,
    grinderId: shot.grinder_id,
    grindKey: normalizeGrindSetting(shot.grind_setting),
    finalWeightGrams: finalWeight,
    overshootGrams: overshoot,
    shotAt: shot.shot_at,
  }];
}

function similarityScore(shot: StopMeasurement, beanId: string | null, grinderId: string | null, grindKey: string | null) {
  const sameGrinder = shot.grinderId === grinderId;
  return (beanId !== null && shot.beanId === beanId ? 4 : 0)
    + (sameGrinder ? 2 : 0)
    + (sameGrinder && grindKey !== null && shot.grindKey === grindKey ? 1 : 0);
}

function normalizeGrindSetting(value: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  const numeric = Number(normalized.replace(",", "."));
  return Number.isFinite(numeric) ? `number:${numeric}` : `text:${normalized}`;
}

function finitePositiveNumber(value: number | null | undefined, allowZero = false) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return allowZero ? value >= 0 ? value : null : value > 0 ? value : null;
}

function robustMedian(values: readonly number[]) {
  const center = median(values) as number;
  const deviation = median(values.map((value) => Math.abs(value - center))) as number;
  const filtered = values.length >= 4 && deviation > 0
    ? values.filter((value) => Math.abs(value - center) <= 3 * deviation)
    : values;
  return { value: median(filtered) as number, sampleSize: filtered.length };
}

function buildTip(targetWeight: number, expectedOvershoot: number, sampleSize: number, source: StopWeightTip["source"]): StopWeightTip {
  const safeOvershoot = Math.min(targetWeight, Math.max(0, expectedOvershoot));
  return {
    recommendedStopWeightGrams: roundWeight(targetWeight - safeOvershoot),
    expectedOvershootGrams: roundWeight(safeOvershoot),
    targetFinalWeightGrams: roundWeight(targetWeight),
    sampleSize,
    source,
  };
}

function roundWeight(value: number) {
  return Math.round(value * 10) / 10;
}
