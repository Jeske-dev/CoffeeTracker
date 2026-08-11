import type { RecipeSnapshot, RecommendationShot, RecommendationSignals } from "./types";
import { TARGET_EXTRACTION_MAX_SECONDS, TARGET_EXTRACTION_MIN_SECONDS } from "./policy";

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

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

export function calculateSignals(shot: RecommendationShot): RecommendationSignals {
  const brewRatio = shot.finalYieldGrams !== null && shot.doseGrams !== null && shot.doseGrams > 0
    ? shot.finalYieldGrams / shot.doseGrams
    : null;
  const actualOvershoot = shot.finalYieldGrams !== null && shot.stopWeightGrams !== null
    ? shot.finalYieldGrams - shot.stopWeightGrams
    : null;
  const extractionTime = shot.extractionTimeSeconds;
  const fastShot = extractionTime !== null && extractionTime < TARGET_EXTRACTION_MIN_SECONDS;
  const slowShot = extractionTime !== null && extractionTime > TARGET_EXTRACTION_MAX_SECONDS;
  const timeNearTarget = extractionTime !== null && !fastShot && !slowShot;
  const severeChanneling = shot.extractionPicture === "channeling";
  const goodShot = timeNearTarget && (shot.overallTasteRating ?? 0) >= 4 && shot.taste === "balanced" && !severeChanneling;
  return {
    brewRatio,
    actualOvershoot,
    fastShot,
    slowShot,
    timeNearTarget,
    severeChanneling,
    goodShot,
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
