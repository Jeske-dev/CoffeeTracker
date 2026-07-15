import { estimateStopWeight, type StopWeightMeasurement } from "@/features/shots/stop-weight-estimate";
import type { ExecutionAdjustment, RecommendationShot } from "./types";

export function calculateStopWeight(
  shot: RecommendationShot,
  history: RecommendationShot[],
  targetYieldGrams: number | null,
  targetGrindSetting = shot.grindSetting,
): ExecutionAdjustment | null {
  const measurements = uniqueShots([shot, ...history]).map(toMeasurement);
  const estimate = estimateStopWeight({
    beanId: shot.beanId,
    grindSetting: targetGrindSetting,
    targetFinalWeightGrams: targetYieldGrams,
    history: measurements,
  });
  if (!estimate) return null;

  return {
    recommendedStopWeightGrams: estimate.recommendedStopWeightGrams,
    expectedOvershootGrams: estimate.expectedOvershootGrams,
    sampleSize: estimate.sampleSize,
    confidence: estimate.sampleSize >= 5 ? 0.85 : estimate.sampleSize >= 3 ? 0.65 : estimate.sampleSize >= 1 ? 0.45 : 0.25,
  };
}

function toMeasurement(shot: RecommendationShot): StopWeightMeasurement {
  return {
    id: shot.id,
    beanId: shot.beanId,
    grindSetting: shot.grindSetting,
    stopWeightGrams: shot.stopWeightGrams,
    finalWeightGrams: shot.finalYieldGrams,
  };
}

function uniqueShots(shots: RecommendationShot[]) {
  const ids = new Set<string>();
  return shots.filter((shot) => {
    if (ids.has(shot.id)) return false;
    ids.add(shot.id);
    return true;
  });
}
