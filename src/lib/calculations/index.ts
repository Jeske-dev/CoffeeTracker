import { differenceInCalendarDays } from "date-fns";
import type { PuckState, Shot, ShotFlow, ShotTaste } from "@/types/domain";

export const TASTE_COLORS: Record<ShotTaste, string> = {
  very_sour: "#D5A347", sour: "#D6B262", balanced: "#6F806F", bitter: "#B5745B", very_bitter: "#945447",
};

export function brewRatio(finalYieldGrams: number | null, doseGrams: number | null) {
  return finalYieldGrams !== null && doseGrams !== null && doseGrams > 0 ? finalYieldGrams / doseGrams : null;
}
export function postStopDrip(finalYieldGrams: number | null, stopWeightGrams: number | null) { return finalYieldGrams !== null && stopWeightGrams !== null ? finalYieldGrams - stopWeightGrams : null; }
export function roastAgeDays(roastDate: string | Date | null, at: string | Date = new Date()) {
  if (!roastDate) return null;
  return Math.max(0, differenceInCalendarDays(new Date(at), new Date(roastDate)));
}
export function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

export function shotScore(input: { extractionSeconds: number; brewRatio: number; taste: ShotTaste; flow: ShotFlow; puck: PuckState }) {
  let score = 100;
  score -= Math.min(20, Math.abs(input.extractionSeconds - 28) * 2.2);
  score -= Math.min(18, Math.abs(input.brewRatio - 1.95) * 28);
  score -= { very_sour: 18, sour: 8, balanced: 0, bitter: 8, very_bitter: 18 }[input.taste];
  score -= { even: 0, minor_channeling: 5, channeling: 14, spritzing: 18 }[input.flow];
  score -= { ideal: 0, dry: 5, wet: 5, stuck: 8 }[input.puck];
  return Math.round(clamp(score, 45, 98));
}

export type ScoreMetricValue = number | string | boolean | null | undefined;
export type ScoreComponent = { score: number | null; coverage: number; valid: boolean };
export type DialedScoreInput = {
  doseGrams?: number | null;
  finalYieldGrams?: number | null;
  extractionSeconds?: number | null;
  overallTasteRating?: number | null;
  tasteBalance?: ShotTaste | null;
  channeling?: boolean | null;
  flowEvenness?: number | null;
  flow?: ShotFlow | null;
  puck?: PuckState | null;
  tds?: number | null;
  previousComparableScores?: number[] | null;
};
export type DialedScoreResult = {
  score: number | null;
  coverage: number;
  coverageLabel: "Geringe Aussagekraft" | "Vorläufig" | "Aussagekräftig" | "Sehr detailliert";
  provisional: boolean;
  components: { sensory: ScoreComponent; recipe: ScoreComponent; flowPuck: ScoreComponent; consistency: ScoreComponent; chemistry: ScoreComponent };
};

const provided = (value: ScoreMetricValue): value is number | string | boolean => value !== null && value !== undefined;
const weightedAverage = (metrics: Array<{ score: number | null; weight: number }>, totalWeight: number): ScoreComponent => {
  const validMetrics = metrics.filter((metric): metric is { score: number; weight: number } => metric.score !== null && Number.isFinite(metric.score));
  if (!validMetrics.length) return { score: null, coverage: 0, valid: false };
  const score = validMetrics.reduce((sum, metric) => sum + metric.score * metric.weight, 0) / validMetrics.reduce((sum, metric) => sum + metric.weight, 0);
  const coverage = validMetrics.reduce((sum, metric) => sum + metric.weight, 0) / totalWeight * 100;
  return { score: Math.round(score), coverage: Math.round(coverage), valid: true };
};
const tasteScore = (taste: ShotTaste) => ({ very_sour: 30, sour: 58, balanced: 100, bitter: 58, very_bitter: 30 }[taste]);
const ratingScore = (rating: number) => Math.max(0, Math.min(100, (rating - 1) * 25));
const flowEvennessScore = (flow: ShotFlow) => ({ even: 100, minor_channeling: 70, channeling: 35, spritzing: 15 }[flow]);
const puckScore = (puck: PuckState) => ({ ideal: 100, dry: 65, wet: 65, stuck: 45 }[puck]);

export function calculateDialedScore(input: DialedScoreInput): DialedScoreResult {
  const ratio = typeof input.doseGrams === "number" && input.doseGrams > 0 && typeof input.finalYieldGrams === "number" ? input.finalYieldGrams / input.doseGrams : null;
  const sensory = weightedAverage([
    { score: provided(input.overallTasteRating) ? ratingScore(input.overallTasteRating) : null, weight: 0.55 },
    { score: input.tasteBalance ? tasteScore(input.tasteBalance) : null, weight: 0.45 },
  ], 1);
  const recipe = weightedAverage([
    { score: ratio === null ? null : Math.max(0, 100 - Math.abs(ratio - 1.95) * 42), weight: 0.6 },
    { score: typeof input.extractionSeconds === "number" ? Math.max(0, 100 - Math.abs(input.extractionSeconds - 28) * 3.2) : null, weight: 0.4 },
  ], 1);
  const flowPuck = weightedAverage([
    { score: provided(input.channeling) ? (input.channeling ? 25 : 100) : null, weight: 0.45 },
    { score: input.flowEvenness !== null && input.flowEvenness !== undefined ? Math.max(0, Math.min(100, input.flowEvenness)) : input.flow ? flowEvennessScore(input.flow) : null, weight: 0.4 },
    { score: input.puck ? puckScore(input.puck) : null, weight: 0.15 },
  ], 1);
  const previous = input.previousComparableScores?.filter((score) => Number.isFinite(score)) ?? [];
  const consistency: ScoreComponent = previous.length >= 3 ? { score: Math.round(previous.slice(0, 3).reduce((sum, score) => sum + score, 0) / Math.min(previous.length, 5)), coverage: 100, valid: true } : { score: null, coverage: 0, valid: false };
  const chemistry = weightedAverage([{ score: typeof input.tds === "number" && input.tds > 0 && ratio !== null ? Math.max(0, 100 - Math.abs(input.tds - 1.35) * 70) : null, weight: 1 }], 1);
  const components = { sensory, recipe, flowPuck, consistency, chemistry };
  const overallReady = ratio !== null && typeof input.extractionSeconds === "number" && sensory.valid;
  const componentWeights = { sensory: 0.35, recipe: 0.35, flowPuck: 0.2, consistency: 0.05, chemistry: 0.05 } as const;
  const available = (Object.keys(componentWeights) as Array<keyof typeof componentWeights>).filter((key) => components[key].score !== null);
  const normalizedWeight = available.reduce((sum, key) => sum + componentWeights[key], 0);
  const score = overallReady && available.length ? Math.round(Math.exp(available.reduce((sum, key) => sum + componentWeights[key] * Math.log(Math.max(1, components[key].score!)), 0) / normalizedWeight)) : null;
  const coverage = Math.round(Math.min(100, sensory.coverage * 0.45 + recipe.coverage * 0.25 + flowPuck.coverage * 0.15));
  const coverageLabel = coverage < 40 ? "Geringe Aussagekraft" : coverage < 70 ? "Vorläufig" : coverage < 90 ? "Aussagekräftig" : "Sehr detailliert";
  return { score, coverage, coverageLabel, provisional: coverage < 70, components };
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

export function dialInRecommendation(shot?: Pick<Shot, "flow" | "taste" | "extraction_seconds" | "final_yield_grams" | "dose_grams" | "stop_weight_grams"> | null) {
  if (!shot || shot.flow === null || shot.taste === null || shot.extraction_seconds === null || shot.final_yield_grams === null || shot.dose_grams === null || shot.stop_weight_grams === null) return { title: "Ersten Shot dokumentieren", detail: "Deine erste Extraktion schafft die Grundlage für persönliche Dial‑in‑Hinweise." };
  const ratio = brewRatio(shot.final_yield_grams, shot.dose_grams);
  if (shot.flow === "channeling" || shot.flow === "spritzing") return { title: "Puck Prep zuerst stabilisieren", detail: "Verteilung, WDT und gerades Tampen prüfen, bevor du den Mahlgrad veränderst." };
  if (shot.flow === "minor_channeling") return { title: "Verteilung noch ruhiger machen", detail: "WDT und Tampen gleichmäßig ausführen, um kleine Kanäle zu vermeiden." };
  if ((shot.taste === "sour" || shot.taste === "very_sour") && shot.extraction_seconds < 25) return { title: "Ein Tick feiner mahlen", detail: "Der Shot war sauer und lief zu schnell. Eine kleine feinere Einstellung verlängert die Extraktion." };
  if (shot.taste === "sour" || shot.taste === "very_sour") return { title: "Temperatur leicht erhöhen", detail: "Die Zeit passt bereits. Etwas mehr Temperatur kann die Extraktion und Süße erhöhen." };
  if ((shot.taste === "bitter" || shot.taste === "very_bitter") && shot.extraction_seconds > 32) return { title: "Etwas gröber mahlen", detail: "Der Shot war bitter und lief langsam. Eine kleine gröbere Einstellung verkürzt den Bezug." };
  if ((shot.taste === "bitter" || shot.taste === "very_bitter") && ratio !== null && ratio > 2.15) return { title: "Etwas früher stoppen", detail: "Reduziere den Yield, damit weniger bittere Stoffe in die Tasse gelangen." };
  if ((postStopDrip(shot.final_yield_grams, shot.stop_weight_grams) ?? 0) > 3) return { title: "Pumpe künftig früher stoppen", detail: "Der Nachlauf war hoch. Plane den Maschinen-Nachlauf beim nächsten Zielgewicht ein." };
  return { title: "Rezept sitzt – festhalten", detail: "Der Shot war balanciert und stabil. Ändere nur kleine Parameter und nutze ihn als Referenz." };
}
