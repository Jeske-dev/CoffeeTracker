import { median } from "@/lib/statistics";
import type { ExecutionAdjustment, RecommendationShot } from "./types";

export function calculateStopWeight(shot: RecommendationShot, history: RecommendationShot[], targetYieldGrams: number | null): ExecutionAdjustment | null {
  if (targetYieldGrams === null || shot.machineId === null) return null;
  const candidates = history.filter((item) => item.id !== shot.id && item.machineId === shot.machineId && item.stopWeightGrams !== null && item.finalYieldGrams !== null)
    .slice(0, 10)
    .map((item) => (item.finalYieldGrams as number) - (item.stopWeightGrams as number));
  if (!candidates.length) return null;
  const initialMedian = median(candidates) as number;
  const mad = median(candidates.map((value) => Math.abs(value - initialMedian))) as number;
  const filtered = candidates.length >= 4 && mad > 0 ? candidates.filter((value) => Math.abs(value - initialMedian) <= 3 * mad) : candidates;
  const expected = median(filtered) as number;
  return {
    recommendedStopWeightGrams: Math.round((targetYieldGrams - expected) * 10) / 10,
    expectedOvershootGrams: Math.round(expected * 10) / 10,
    sampleSize: filtered.length,
    confidence: filtered.length >= 5 ? 0.85 : filtered.length >= 3 ? 0.65 : 0.35,
  };
}
