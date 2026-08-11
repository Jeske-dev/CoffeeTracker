import type { RecommendationOutcome } from "./types";

export function calculateOutcome(input: {
  previousSensoryScore?: number | null; newSensoryScore?: number | null;
  previousRecipeScore?: number | null; newRecipeScore?: number | null;
  previousFlowScore?: number | null; newFlowScore?: number | null;
  previousTotalScore?: number | null; newTotalScore?: number | null;
  manualAdditionalChangeCount?: number; userFeedback?: "helpful" | "not_helpful" | null;
}): RecommendationOutcome {
  const difference = (before?: number | null, after?: number | null) => before == null || after == null ? null : after - before;
  const sensoryImprovement = difference(input.previousSensoryScore, input.newSensoryScore);
  const recipeImprovement = difference(input.previousRecipeScore, input.newRecipeScore);
  const flowImprovement = difference(input.previousFlowScore, input.newFlowScore);
  const weighted = [[sensoryImprovement, 0.5], [recipeImprovement, 0.3], [flowImprovement, 0.2]] as const;
  const available = weighted.filter(([value]) => value !== null);
  const value = available.length ? available.reduce((sum, [part, weight]) => sum + (part as number) * weight, 0) / available.reduce((sum, [, weight]) => sum + weight, 0) : null;
  if ((input.manualAdditionalChangeCount ?? 0) > 1) return { value, sensoryImprovement, recipeImprovement, flowImprovement, status: "ambiguous" };
  if (input.userFeedback === "helpful" || (input.previousTotalScore != null && input.newTotalScore != null && input.newTotalScore - input.previousTotalScore >= 5) || (value !== null && value > 0.15)) return { value, sensoryImprovement, recipeImprovement, flowImprovement, status: "successful" };
  if (input.userFeedback === "not_helpful" || (value !== null && value < -0.15)) return { value, sensoryImprovement, recipeImprovement, flowImprovement, status: "unsuccessful" };
  return { value, sensoryImprovement, recipeImprovement, flowImprovement, status: value === null ? "unknown" : "ambiguous" };
}

export function personalEffectiveness(successfulApplications: number, totalEvaluableApplications: number) {
  return totalEvaluableApplications < 3 ? 0.5 : (successfulApplications + 1) / (totalEvaluableApplications + 2);
}
