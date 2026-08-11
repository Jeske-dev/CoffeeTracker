import { comparableShots, calculateSignals, resolveTargetRecipe } from "./signals";
import { candidateScore, generateCandidates } from "./rules";
import { calculateStopWeight } from "./stop-weight";
import { RECOMMENDATION_ENGINE_VERSION, type RecommendationBundle, type RecommendationInput } from "./types";

export function generateRecommendation(input: RecommendationInput): RecommendationBundle {
  const target = resolveTargetRecipe(input.shot, input.activeRecipe, input.referenceRecipe, input.starterRecipe);
  const comparable = comparableShots(input.shot, input.history, target);
  const signals = calculateSignals(input.shot);
  const candidates = generateCandidates({ ...input, target, comparable, signals });
  const primary = [...candidates].sort((a, b) => a.priorityTier - b.priorityTier || candidateScore(b) - candidateScore(a))[0];
  const targetYield = input.shot.finalYieldGrams ?? target?.targetYieldGrams ?? null;
  const recommendedGrind = primary.changes.find((change) => change.field === "grindSetting")?.recommendedValue;
  const targetGrindSetting = typeof recommendedGrind === "string" ? recommendedGrind : input.shot.grindSetting;
  return {
    engineVersion: RECOMMENDATION_ENGINE_VERSION,
    sourceShotId: input.shot.id,
    targetRecipeSnapshot: target,
    primary,
    executionAdjustment: calculateStopWeight(input.shot, input.history, targetYield, targetGrindSetting),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}
