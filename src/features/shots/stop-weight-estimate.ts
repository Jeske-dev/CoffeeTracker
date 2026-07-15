import { median } from "@/lib/statistics";

const MAX_MATCHING_SHOTS = 10;
const MAX_SCALED_SHOTS = 5;
const MAX_OVERSHOOT_SHARE = 0.3;
const DEFAULT_STOP_TO_FINAL_RATIO = 34 / 36;

export type StopWeightMeasurement = {
  id: string;
  beanId: string | null;
  grindSetting: string | null;
  stopWeightGrams: number | null;
  finalWeightGrams: number | null;
  occurredAt?: string;
};

export type StopWeightEstimate = {
  recommendedStopWeightGrams: number;
  expectedOvershootGrams: number;
  targetFinalWeightGrams: number;
  sampleSize: number;
  source: "matching_history" | "scaled_history" | "rule_of_three";
};

type ValidMeasurement = {
  beanId: string | null;
  grindKey: string | null;
  finalWeightGrams: number;
  overshootGrams: number;
};

export function estimateStopWeight({
  beanId,
  grindSetting,
  targetFinalWeightGrams,
  history,
}: {
  beanId: string | null;
  grindSetting: string | null;
  targetFinalWeightGrams: number | null;
  history: readonly StopWeightMeasurement[];
}): StopWeightEstimate | null {
  const targetWeight = finitePositiveNumber(targetFinalWeightGrams);
  if (targetWeight === null) return null;

  const grindKey = normalizeGrindSetting(grindSetting);
  const measurements = history.flatMap(toValidMeasurement);
  const matching = measurements
    .filter((item) => beanId !== null && grindKey !== null && item.beanId === beanId && item.grindKey === grindKey)
    .slice(0, MAX_MATCHING_SHOTS);

  if (matching.length) {
    const average = robustAverage(matching.map((item) => item.overshootGrams));
    return buildEstimate(targetWeight, average.value, average.sampleSize, "matching_history");
  }

  const scored = measurements.map((item) => ({
    item,
    score: (beanId !== null && item.beanId === beanId ? 2 : 0) + (grindKey !== null && item.grindKey === grindKey ? 1 : 0),
  }));
  const highestScore = Math.max(...scored.map(({ score }) => score));
  const comparable = scored
    .filter(({ score }) => score === highestScore)
    .map(({ item }) => item)
    .slice(0, MAX_SCALED_SHOTS);

  if (comparable.length) {
    const averageRatio = robustAverage(comparable.map((item) => item.overshootGrams / item.finalWeightGrams));
    return buildEstimate(targetWeight, targetWeight * averageRatio.value, averageRatio.sampleSize, "scaled_history");
  }

  return buildEstimate(targetWeight, targetWeight * (1 - DEFAULT_STOP_TO_FINAL_RATIO), 0, "rule_of_three");
}

function toValidMeasurement(measurement: StopWeightMeasurement): ValidMeasurement[] {
  const stopWeight = finitePositiveNumber(measurement.stopWeightGrams, true);
  const finalWeight = finitePositiveNumber(measurement.finalWeightGrams);
  if (stopWeight === null || finalWeight === null) return [];
  const overshoot = finalWeight - stopWeight;
  if (overshoot < 0 || overshoot / finalWeight > MAX_OVERSHOOT_SHARE) return [];
  return [{
    beanId: measurement.beanId,
    grindKey: normalizeGrindSetting(measurement.grindSetting),
    finalWeightGrams: finalWeight,
    overshootGrams: overshoot,
  }];
}

function normalizeGrindSetting(value: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  const numeric = Number(normalized.replace(",", "."));
  return Number.isFinite(numeric) ? `number:${numeric}` : `text:${normalized}`;
}

function finitePositiveNumber(value: number | null, allowZero = false) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return allowZero ? value >= 0 ? value : null : value > 0 ? value : null;
}

function robustAverage(values: readonly number[]) {
  const center = median(values) as number;
  const deviation = median(values.map((value) => Math.abs(value - center))) as number;
  const filtered = values.length >= 4 && deviation > 0
    ? values.filter((value) => Math.abs(value - center) <= 3 * deviation)
    : values;
  return {
    value: filtered.reduce((sum, value) => sum + value, 0) / filtered.length,
    sampleSize: filtered.length,
  };
}

function buildEstimate(targetWeight: number, expectedOvershoot: number, sampleSize: number, source: StopWeightEstimate["source"]): StopWeightEstimate {
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
