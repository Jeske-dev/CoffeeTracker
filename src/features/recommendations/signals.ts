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

export function recipeIdentity(recipe: RecipeSnapshot | null) {
  if (!recipe) return "none";
  return JSON.stringify({
    id: recipe.id ?? null,
    doseGrams: recipe.doseGrams,
    targetYieldGrams: recipe.targetYieldGrams,
    targetExtractionTimeSeconds: recipe.targetExtractionTimeSeconds,
    grindSetting: recipe.grindSetting,
    prepTools: recipe.prepTools ? [...recipe.prepTools].sort() : null,
  });
}

export function calculateSignals(shot: RecommendationShot, target: RecipeSnapshot | null): RecommendationSignals {
  const brewRatio = shot.finalYieldGrams !== null && shot.doseGrams !== null && shot.doseGrams > 0
    ? shot.finalYieldGrams / shot.doseGrams
    : null;
  const actualOvershoot = shot.finalYieldGrams !== null && shot.stopWeightGrams !== null
    ? shot.finalYieldGrams - shot.stopWeightGrams
    : null;
  const targetTime = target?.targetExtractionTimeSeconds ?? null;
  const timeDeviation = shot.extractionTimeSeconds !== null && targetTime !== null
    ? shot.extractionTimeSeconds - targetTime
    : null;
  const timeThreshold = targetTime !== null ? Math.max(3, targetTime * 0.12) : null;
  const severeChanneling = shot.extractionPicture === "channeling";
  const hasTasteData = shot.overallTasteRating !== null || shot.taste !== null;
  const goodShot = (shot.overallTasteRating ?? 0) >= 4 && shot.taste === "balanced" && !severeChanneling;
  return {
    brewRatio,
    actualOvershoot,
    timeDeviation,
    timeThreshold,
    fastShot: timeDeviation !== null && timeThreshold !== null && timeDeviation < -timeThreshold,
    slowShot: timeDeviation !== null && timeThreshold !== null && timeDeviation > timeThreshold,
    timeNearTarget: timeDeviation !== null && timeThreshold !== null && Math.abs(timeDeviation) <= timeThreshold,
    severeChanneling,
    goodShot,
    hasTasteData,
  };
}

export function isComparable(current: RecommendationShot, candidate: RecommendationShot, target: RecipeSnapshot | null) {
  if (current.beanId !== candidate.beanId) return false;
  if (current.machineId !== candidate.machineId) return false;
  if (current.grinderId !== candidate.grinderId) return false;
  if (current.basketId !== candidate.basketId) return false;
  return recipeIdentity(target) === recipeIdentity(candidate.targetRecipeSnapshot);
}

export function comparableShots(current: RecommendationShot, history: RecommendationShot[], target: RecipeSnapshot | null) {
  return history.filter((shot) => shot.id !== current.id && isComparable(current, shot, target)).slice(0, 10);
}
