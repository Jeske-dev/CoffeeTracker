import { comparableShots, calculateSignals, resolveTargetRecipe } from "./signals";
import { candidateScore, generateCandidates } from "./rules";
import { calculateStopWeight } from "./stop-weight";
import { RECOMMENDATION_ENGINE_VERSION, type RecommendationBundle, type RecommendationInput } from "./types";

export function generateRecommendation(input: RecommendationInput): RecommendationBundle {
  const target = resolveTargetRecipe(input.shot, input.activeRecipe, input.referenceRecipe, input.starterRecipe);
  const comparable = comparableShots(input.shot, input.history, target);
  const signals = calculateSignals(input.shot, target);
  const candidates = generateCandidates({ ...input, target, comparable, signals });
  const primary = [...candidates].sort((a, b) => a.priorityTier - b.priorityTier || candidateScore(b) - candidateScore(a))[0];
  const changedTargetYield = primary.changes.find((change) => change.field === "targetYieldGrams")?.recommendedValue;
  const targetYield = typeof changedTargetYield === "number" ? changedTargetYield : target?.targetYieldGrams ?? input.shot.finalYieldGrams;
  return {
    engineVersion: RECOMMENDATION_ENGINE_VERSION,
    sourceShotId: input.shot.id,
    targetRecipeSnapshot: target,
    primary,
    executionAdjustment: calculateStopWeight(input.shot, input.history, targetYield),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}
