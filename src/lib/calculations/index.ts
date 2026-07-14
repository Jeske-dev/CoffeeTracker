import { differenceInCalendarDays } from "date-fns";
import type { Shot, ShotFlow, ShotTaste } from "@/types/domain";

export const SCORING_VERSION = "2.0.0-simple" as const;

export const TASTE_COLORS: Record<ShotTaste, string> = {
  sour: "#a3a3a3",
  balanced: "#000000",
  bitter: "#525252",
};

export function brewRatio(finalYieldGrams: number | null, doseGrams: number | null) {
  return finalYieldGrams !== null && doseGrams !== null && doseGrams > 0 ? finalYieldGrams / doseGrams : null;
}

export function postStopDrip(finalYieldGrams: number | null, stopWeightGrams: number | null) {
  return finalYieldGrams !== null && stopWeightGrams !== null ? finalYieldGrams - stopWeightGrams : null;
}

export function roastAgeDays(roastDate: string | Date | null, at: string | Date = new Date()) {
  if (!roastDate) return null;
  return Math.max(0, differenceInCalendarDays(new Date(at), new Date(roastDate)));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export type ScoreTargetRecipe = {
  doseGrams: number | null;
  targetYieldGrams: number | null;
  targetExtractionTimeSeconds: number | null;
};

export type ComparableShotMetrics = {
  doseGrams: number | null;
  finalYieldGrams: number | null;
  extractionSeconds: number | null;
};

export type ScoreComponent = { score: number | null; coverage: number; valid: boolean };

export type DialedScoreInput = {
  doseGrams?: number | null;
  finalYieldGrams?: number | null;
  extractionSeconds?: number | null;
  overallTasteRating?: number | null;
  tasteBalance?: ShotTaste | null;
  extractionPicture?: ShotFlow | null;
  targetRecipe?: ScoreTargetRecipe | null;
  previousComparableShots?: ComparableShotMetrics[] | null;
};

export type DialedScoreResult = {
  score: number | null;
  coverage: number;
  coverageLabel: "Geringe Aussagekraft" | "Vorläufig" | "Aussagekräftig" | "Sehr detailliert";
  provisional: boolean;
  complete: boolean;
  missingTasteEvaluation: boolean;
  components: {
    taste: ScoreComponent;
    recipe: ScoreComponent;
    extractionPicture: ScoreComponent;
    consistency: ScoreComponent;
  };
};

type WeightedMetric = { score: number | null; weight: number };

function weightedComponent(metrics: WeightedMetric[]): ScoreComponent {
  const available = metrics.filter((metric): metric is { score: number; weight: number } => metric.score !== null && Number.isFinite(metric.score));
  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
  if (!available.length) return { score: null, coverage: 0, valid: false };
  const availableWeight = available.reduce((sum, metric) => sum + metric.weight, 0);
  const score = available.reduce((sum, metric) => sum + metric.score * metric.weight, 0) / availableWeight;
  return { score: Math.round(score), coverage: Math.round(availableWeight / totalWeight * 100), valid: true };
}

export function targetScore(value: number, target: number, halfScoreDeviation: number) {
  return 100 * Math.pow(2, -(((value - target) / halfScoreDeviation) ** 2));
}

function ratingScore(rating: number) {
  return clamp(rating * 20, 0, 100);
}

function balanceScore(taste: ShotTaste) {
  const balance = taste === "sour" ? -1 : taste === "bitter" ? 1 : 0;
  return 100 * Math.pow(2, -((balance / 1.1) ** 2));
}

function extractionPictureScore(flow: ShotFlow) {
  return ({ even: 100, minor_channeling: 70, channeling: 25 })[flow];
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function consistencyComponent(input: DialedScoreInput, currentRatio: number | null): ScoreComponent {
  const previous = (input.previousComparableShots ?? []).slice(0, 10);
  if (previous.length < 3) return { score: null, coverage: 0, valid: false };
  const ratioMedian = median(previous.flatMap((shot) => {
    const ratio = brewRatio(shot.finalYieldGrams, shot.doseGrams);
    return ratio === null ? [] : [ratio];
  }));
  const timeMedian = median(previous.flatMap((shot) => shot.extractionSeconds === null ? [] : [shot.extractionSeconds]));
  const doseMedian = median(previous.flatMap((shot) => shot.doseGrams === null ? [] : [shot.doseGrams]));
  return weightedComponent([
    { score: currentRatio !== null && ratioMedian !== null ? targetScore(currentRatio, ratioMedian, 0.15) : null, weight: 0.5 },
    { score: input.extractionSeconds != null && timeMedian !== null ? targetScore(input.extractionSeconds, timeMedian, 5) : null, weight: 0.35 },
    { score: input.doseGrams != null && doseMedian !== null ? targetScore(input.doseGrams, doseMedian, 0.4) : null, weight: 0.15 },
  ]);
}

export function calculateDialedScore(input: DialedScoreInput): DialedScoreResult {
  const ratio = brewRatio(input.finalYieldGrams ?? null, input.doseGrams ?? null);
  const targetRatio = brewRatio(input.targetRecipe?.targetYieldGrams ?? null, input.targetRecipe?.doseGrams ?? null);
  const taste = weightedComponent([
    { score: input.overallTasteRating != null ? ratingScore(input.overallTasteRating) : null, weight: 0.65 },
    { score: input.tasteBalance ? balanceScore(input.tasteBalance) : null, weight: 0.35 },
  ]);
  const recipe = weightedComponent([
    { score: ratio !== null && targetRatio !== null ? targetScore(ratio, targetRatio, 0.3) : null, weight: 0.5 },
    { score: input.extractionSeconds != null && input.targetRecipe?.targetExtractionTimeSeconds != null ? targetScore(input.extractionSeconds, input.targetRecipe.targetExtractionTimeSeconds, 10) : null, weight: 0.35 },
    { score: input.doseGrams != null && input.targetRecipe?.doseGrams != null ? targetScore(input.doseGrams, input.targetRecipe.doseGrams, 1) : null, weight: 0.15 },
  ]);
  const extractionPicture: ScoreComponent = input.extractionPicture
    ? { score: extractionPictureScore(input.extractionPicture), coverage: 100, valid: true }
    : { score: null, coverage: 0, valid: false };
  const consistency = consistencyComponent(input, ratio);
  const components = { taste, recipe, extractionPicture, consistency };
  const componentWeights = { taste: 0.5, recipe: 0.35, extractionPicture: 0.1, consistency: 0.05 } as const;
  const available = (Object.keys(componentWeights) as Array<keyof typeof componentWeights>).filter((key) => components[key].score !== null);
  const availableWeight = available.reduce((sum, key) => sum + componentWeights[key], 0);
  const missingTasteEvaluation = input.overallTasteRating == null && input.tasteBalance == null;
  const complete = input.doseGrams != null && input.finalYieldGrams != null && input.extractionSeconds != null && !missingTasteEvaluation;
  const score = complete && availableWeight > 0
    ? Math.round(100 * Math.exp(available.reduce((sum, key) => sum + componentWeights[key] * Math.log(Math.max(components[key].score as number, 5) / 100), 0) / availableWeight))
    : null;
  const coverage = Math.round(
    (input.overallTasteRating != null ? 25 : 0) +
    (input.tasteBalance != null ? 15 : 0) +
    (input.doseGrams != null ? 15 : 0) +
    (input.finalYieldGrams != null ? 15 : 0) +
    (input.extractionSeconds != null ? 20 : 0) +
    (input.extractionPicture != null ? 10 : 0),
  );
  const coverageLabel = coverage < 40 ? "Geringe Aussagekraft" : coverage < 70 ? "Vorläufig" : coverage < 90 ? "Aussagekräftig" : "Sehr detailliert";
  return { score, coverage, coverageLabel, provisional: coverage < 70, complete, missingTasteEvaluation, components };
}

export function scoreTargetFromSnapshot(value: unknown): ScoreTargetRecipe | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const numberOrNull = (candidate: unknown) => typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
  const target = {
    doseGrams: numberOrNull(row.doseGrams),
    targetYieldGrams: numberOrNull(row.targetYieldGrams),
    targetExtractionTimeSeconds: numberOrNull(row.targetExtractionTimeSeconds),
  };
  return Object.values(target).some((item) => item !== null) ? target : null;
}

export function isSweetSpot(extractionSeconds: number | null, ratio: number | null) {
  return extractionSeconds !== null && ratio !== null && extractionSeconds >= 25 && extractionSeconds <= 32 && ratio >= 1.8 && ratio <= 2.15;
}

export function loggingStreak(shots: Pick<Shot, "shot_at">[]) {
  if (!shots.length) return 0;
  const ordered = [...shots].sort((a, b) => +new Date(b.shot_at) - +new Date(a.shot_at));
  let count = 1;
  for (let index = 1; index < ordered.length; index += 1) {
    if (differenceInCalendarDays(new Date(ordered[index - 1].shot_at), new Date(ordered[index].shot_at)) > 7) break;
    count += 1;
  }
  return count;
}
