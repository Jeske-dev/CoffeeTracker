import type { RecipeSnapshot, RecommendationShot, RecommendationSignals } from "./types";

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const roundTo = (value: number, step: number) => Math.round(value / step) * step;

export function resolveTargetRecipe(
  shot: RecommendationShot,
  activeRecipe?: RecipeSnapshot | null,
  referenceRecipe?: RecipeSnapshot | null,
  starterRecipe?: RecipeSnapshot | null,
) {
  return shot.targetRecipeSnapshot ?? activeRecipe ?? referenceRecipe ?? starterRecipe ?? null;
}

export function calculateSignals(shot: RecommendationShot, target: RecipeSnapshot | null): RecommendationSignals {
  const brewRatio = shot.finalYieldGrams !== null && shot.doseGrams !== null && shot.doseGrams > 0
    ? shot.finalYieldGrams / shot.doseGrams : null;
  const actualOvershoot = shot.finalYieldGrams !== null && shot.stopWeightGrams !== null
    ? shot.finalYieldGrams - shot.stopWeightGrams : null;
  const flowDuration = shot.extractionTimeSeconds !== null && shot.firstDropTimeSeconds !== null
    ? shot.extractionTimeSeconds - shot.firstDropTimeSeconds : null;
  const averageFlow = shot.finalYieldGrams !== null && flowDuration !== null && flowDuration > 0
    ? shot.finalYieldGrams / flowDuration : null;
  const targetTime = target?.targetExtractionTimeSeconds ?? null;
  const timeDeviation = shot.extractionTimeSeconds !== null && targetTime !== null ? shot.extractionTimeSeconds - targetTime : null;
  const timeThreshold = targetTime !== null ? Math.max(3, targetTime * 0.12) : null;
  const sourSignal = shot.tasteBalance === null ? 0 : clamp(-shot.tasteBalance / 2);
  const bitterSignal = shot.tasteBalance === null ? 0 : clamp(shot.tasteBalance / 2);
  const astringencySignal = shot.astringencySeverity === null ? 0 : clamp(shot.astringencySeverity / 4);
  const unevenness = shot.flowEvenness === null ? 0 : clamp((5 - shot.flowEvenness) / 4);
  const channelingSignal = Math.max(
    shot.channelingSeverity === null ? 0 : clamp(shot.channelingSeverity / 4),
    shot.sprayingSeverity === null ? 0 : clamp(shot.sprayingSeverity / 4),
    unevenness,
  );
  const severeFlowProblem = (shot.channelingSeverity ?? -1) >= 3 || (shot.sprayingSeverity ?? -1) >= 3 || (shot.flowEvenness ?? 6) <= 2;
  const relevantChanneling = channelingSignal >= 0.5;
  const hasTasteData = shot.tasteBalance !== null || shot.overallTasteRating !== null || shot.strengthPerception !== null || shot.astringencySeverity !== null;
  const balanced = shot.tasteBalance !== null && Math.abs(shot.tasteBalance) <= 0.5;
  const positiveOnly = shot.strengthPerception === 0 && shot.overallTasteRating === null;
  const goodShot = ((shot.overallTasteRating ?? 0) >= 4 && balanced || positiveOnly) && !severeFlowProblem && astringencySignal < 0.75;
  return {
    brewRatio, actualOvershoot, averageFlow, timeDeviation, timeThreshold,
    fastShot: timeDeviation !== null && timeThreshold !== null && timeDeviation < -timeThreshold,
    slowShot: timeDeviation !== null && timeThreshold !== null && timeDeviation > timeThreshold,
    timeNearTarget: timeDeviation !== null && timeThreshold !== null && Math.abs(timeDeviation) <= timeThreshold,
    sourSignal, bitterSignal, astringencySignal, channelingSignal, relevantChanneling, severeFlowProblem, goodShot, hasTasteData,
  };
}

export function isComparable(current: RecommendationShot, candidate: RecommendationShot, target: RecipeSnapshot | null) {
  if (["beanId", "machineId", "grinderId", "basketId"].some((key) => current[key as keyof RecommendationShot] !== candidate[key as keyof RecommendationShot])) return false;
  if (candidate.experimentMode && candidate.appliedRecommendationId !== current.appliedRecommendationId) return false;
  if ((candidate.channelingSeverity ?? 0) >= 3 || (candidate.sprayingSeverity ?? 0) >= 3 || (candidate.flowEvenness ?? 5) <= 2) return false;
  if (current.doseGrams !== null && candidate.doseGrams !== null && Math.abs(current.doseGrams - candidate.doseGrams) > 0.5) return false;
  const candidateTarget = candidate.targetRecipeSnapshot;
  if (target?.id || candidateTarget?.id) return target?.id === candidateTarget?.id;
  if (target && candidateTarget) {
    const targetRatio = target.doseGrams && target.targetYieldGrams ? target.targetYieldGrams / target.doseGrams : null;
    const candidateRatio = candidateTarget.doseGrams && candidateTarget.targetYieldGrams ? candidateTarget.targetYieldGrams / candidateTarget.doseGrams : null;
    return targetRatio === null || candidateRatio === null ? JSON.stringify(target) === JSON.stringify(candidateTarget) : Math.abs(targetRatio - candidateRatio) <= 0.15;
  }
  return target === null && candidateTarget === null;
}

export function comparableShots(current: RecommendationShot, history: RecommendationShot[], target: RecipeSnapshot | null) {
  return history.filter((shot) => shot.id !== current.id && isComparable(current, shot, target)).slice(0, 10);
}
