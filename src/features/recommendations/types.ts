import type { PuckState, ShotFlow, ShotTaste } from "@/types/domain";

export const RECOMMENDATION_ENGINE_VERSION = "2.0.0-simple" as const;

export type RecommendationActionType =
  | "KEEP_RECIPE"
  | "GRIND_FINER"
  | "GRIND_COARSER"
  | "INCREASE_YIELD"
  | "DECREASE_YIELD"
  | "USE_WDT"
  | "IMPROVE_WDT"
  | "INCREASE_DOSE"
  | "DECREASE_DOSE"
  | "COLLECT_MORE_DATA"
  | "ADJUST_STOP_WEIGHT";

export type ConfidenceLabel = "Niedrige Sicherheit" | "Mittlere Sicherheit" | "Hohe Sicherheit";
export type RecommendationStatus = "active" | "applied" | "dismissed" | "superseded" | "completed";

export type RecipeSnapshot = {
  id?: string | null;
  doseGrams: number | null;
  targetYieldGrams: number | null;
  targetExtractionTimeSeconds: number | null;
  grindSetting: string | null;
  prepTools: string[] | null;
};

export type GrinderConfig = {
  grindScaleType: "stepped" | "stepless" | null;
  minimumSetting: number | null;
  maximumSetting: number | null;
  microStep: number | null;
  finerDirection: "higher" | "lower" | null;
  displayUnit?: string | null;
};

export type BasketConfig = {
  nominalDoseGrams: number | null;
  minimumDoseGrams: number | null;
  maximumDoseGrams: number | null;
};

export type RecommendationShot = {
  id: string;
  beanId: string | null;
  machineId: string | null;
  grinderId: string | null;
  basketId: string | null;
  targetRecipeSnapshot: RecipeSnapshot | null;
  doseGrams: number | null;
  finalYieldGrams: number | null;
  stopWeightGrams: number | null;
  extractionTimeSeconds: number | null;
  grindSetting: string | null;
  prepTools: string[] | null;
  overallTasteRating: number | null;
  taste: ShotTaste | null;
  extractionPicture: ShotFlow | null;
  puck: PuckState | null;
  appliedRecommendationId?: string | null;
  score?: number | null;
};

export type RecommendationChange = {
  field: string;
  previousValue: number | string | boolean | string[] | null;
  recommendedValue: number | string | boolean | string[] | null;
  unit?: string;
};

export type RecommendationEvidence = {
  label: string;
  value: string;
  importance: "primary" | "supporting";
};

export type RecommendationCandidate = {
  actionType: RecommendationActionType;
  priorityTier: number;
  severity: number;
  confidence: number;
  expectedImpact: number;
  personalEffectiveness: number;
  title: string;
  summary: string;
  explanation: string;
  changes: RecommendationChange[];
  evidence: RecommendationEvidence[];
  suppressedReasons: string[];
};

export type ExecutionAdjustment = {
  recommendedStopWeightGrams: number;
  expectedOvershootGrams: number;
  sampleSize: number;
  confidence: number;
};

export type RecommendationBundle = {
  engineVersion: typeof RECOMMENDATION_ENGINE_VERSION;
  sourceShotId: string;
  targetRecipeSnapshot: RecipeSnapshot | null;
  primary: RecommendationCandidate;
  executionAdjustment: ExecutionAdjustment | null;
  generatedAt: string;
};

export type RecommendationInput = {
  shot: RecommendationShot;
  history: RecommendationShot[];
  activeRecipe?: RecipeSnapshot | null;
  referenceRecipe?: RecipeSnapshot | null;
  starterRecipe?: RecipeSnapshot | null;
  grinder?: GrinderConfig | null;
  basket?: BasketConfig | null;
  personalEffectiveness?: Partial<Record<RecommendationActionType, number>>;
  generatedAt?: string;
};

export type RecommendationSignals = {
  brewRatio: number | null;
  actualOvershoot: number | null;
  timeDeviation: number | null;
  timeThreshold: number | null;
  fastShot: boolean;
  slowShot: boolean;
  timeNearTarget: boolean;
  severeChanneling: boolean;
  goodShot: boolean;
  hasTasteData: boolean;
};

export type RecommendationOutcome = {
  value: number | null;
  sensoryImprovement: number | null;
  recipeImprovement: number | null;
  flowImprovement: number | null;
  status: "successful" | "unsuccessful" | "ambiguous" | "unknown";
};
