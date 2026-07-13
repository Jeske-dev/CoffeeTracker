import { roundTo } from "./signals";
import type { GrinderConfig, RecommendationShot } from "./types";

export function normalizedFineness(setting: string | null, grinder?: GrinderConfig | null) {
  if (setting === null || !grinder?.finerDirection) return null;
  const numeric = Number(setting.replace(",", "."));
  if (!Number.isFinite(numeric)) return null;
  return grinder.finerDirection === "higher" ? numeric : -numeric;
}

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function learnGrindSensitivity(shots: RecommendationShot[], grinder?: GrinderConfig | null) {
  if (shots.length < 5 || !grinder) return null;
  const points = shots.flatMap((shot) => {
    const fineness = normalizedFineness(shot.grindSetting, grinder);
    return fineness !== null && shot.extractionTimeSeconds !== null ? [{ shot, fineness, time: shot.extractionTimeSeconds }] : [];
  });
  if (new Set(points.map((point) => point.fineness)).size < 3) return null;
  const slopes: number[] = [];
  for (let i = 0; i < points.length; i += 1) for (let j = i + 1; j < points.length; j += 1) {
    const a = points[i]; const b = points[j];
    if (a.fineness === b.fineness) continue;
    if (a.shot.doseGrams !== null && b.shot.doseGrams !== null && Math.abs(a.shot.doseGrams - b.shot.doseGrams) > 0.5) continue;
    if (a.shot.finalYieldGrams !== null && b.shot.finalYieldGrams !== null && Math.abs(a.shot.finalYieldGrams - b.shot.finalYieldGrams) > 3) continue;
    const slope = (b.time - a.time) / (b.fineness - a.fineness);
    if (slope > 0 && Number.isFinite(slope)) slopes.push(slope);
  }
  const result = median(slopes);
  return result !== null && result > 0 ? result : null;
}

export function grindChange(input: { direction: "finer" | "coarser"; shot: RecommendationShot; targetTime: number; comparable: RecommendationShot[]; grinder?: GrinderConfig | null; strong: boolean }) {
  const step = input.grinder?.microStep ?? 1;
  const sensitivity = learnGrindSensitivity([input.shot, ...input.comparable], input.grinder);
  let magnitude = input.strong ? 2 * step : step;
  if (sensitivity && input.shot.extractionTimeSeconds !== null) magnitude = Math.abs(roundTo((input.targetTime - input.shot.extractionTimeSeconds) / sensitivity, step));
  magnitude = Math.max(step, Math.min(2 * step, magnitude));
  const normalized = normalizedFineness(input.shot.grindSetting, input.grinder);
  if (normalized === null || !input.grinder?.finerDirection) return { previous: input.shot.grindSetting, recommended: null, steps: Math.round(magnitude / step), unit: input.grinder?.displayUnit ?? "Schritt" };
  const nextNormalized = normalized + (input.direction === "finer" ? magnitude : -magnitude);
  let next = input.grinder.finerDirection === "higher" ? nextNormalized : -nextNormalized;
  if (input.grinder.minimumSetting !== null) next = Math.max(input.grinder.minimumSetting, next);
  if (input.grinder.maximumSetting !== null) next = Math.min(input.grinder.maximumSetting, next);
  return { previous: input.shot.grindSetting, recommended: Number(next.toFixed(4)).toString(), steps: Math.round(magnitude / step), unit: input.grinder.displayUnit ?? "Schritt" };
}
