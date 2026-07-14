import { brewRatio } from "@/lib/calculations";
import { formatShortDate } from "@/lib/formatting";
import { parseRecipeSnapshot } from "@/features/recommendations/recipe";
import { recipeIdentity } from "@/features/recommendations/signals";
import type { ShotTaste, ShotWithBean } from "@/types/domain";

export type ShotComparisonPoint = {
  id: string;
  date: string;
  name: string;
  time: number;
  ratio: number;
  taste: ShotTaste | "unknown";
  current: boolean;
  timestamp: number;
};

export type ShotComparisonSeries = {
  current: ShotComparisonPoint | null;
  peers: ShotComparisonPoint[];
  timeDomain: [number, number];
  ratioDomain: [number, number];
  targetArea: { timeMin: number; timeMax: number; ratioMin: number; ratioMax: number } | null;
  emptyReason: string | null;
};

/** Reduces full server-side shot rows to the small model serialized into Recharts. */
export function buildShotComparisonSeries(shot: ShotWithBean, shots: readonly ShotWithBean[]): ShotComparisonSeries {
  const current = toPoint(shot, true);
  if (!current) return emptySeries("Für den Vergleich fehlen Zeit, Dosis oder Yield.");

  const targetKey = recipeIdentity(parseRecipeSnapshot(shot.target_recipe_snapshot));
  const peers = shots
    .filter((candidate) => isComparableShot(shot, candidate, targetKey))
    .sort((left, right) => Date.parse(right.shot_at) - Date.parse(left.shot_at))
    .slice(0, 10)
    .flatMap((candidate) => {
      const point = toPoint(candidate, false);
      return point ? [point] : [];
    })
    .sort((left, right) => left.timestamp - right.timestamp);
  const points = [...peers, current];
  const times = points.map((point) => point.time);
  const ratios = points.map((point) => point.ratio);
  const target = parseRecipeSnapshot(shot.target_recipe_snapshot);
  const targetRatio = brewRatio(target?.targetYieldGrams ?? null, target?.doseGrams ?? null);
  const targetTime = target?.targetExtractionTimeSeconds ?? null;
  const threshold = targetTime === null ? null : Math.max(3, targetTime * 0.12);

  return {
    current,
    peers,
    timeDomain: [Math.max(0, Math.floor(Math.min(...times) - 4)), Math.ceil(Math.max(...times) + 4)],
    ratioDomain: [
      Math.max(0.5, Math.floor((Math.min(...ratios) - 0.25) * 10) / 10),
      Math.ceil((Math.max(...ratios) + 0.25) * 10) / 10,
    ],
    targetArea: targetTime !== null && targetRatio !== null && threshold !== null ? {
      timeMin: targetTime - threshold,
      timeMax: targetTime + threshold,
      ratioMin: targetRatio - 0.15,
      ratioMax: targetRatio + 0.15,
    } : null,
    emptyReason: null,
  };
}

function isComparableShot(current: ShotWithBean, candidate: ShotWithBean, targetKey: string) {
  return candidate.id !== current.id
    && candidate.bean_id === current.bean_id
    && candidate.machine_id === current.machine_id
    && candidate.grinder_id === current.grinder_id
    && candidate.basket_id === current.basket_id
    && candidate.dose_grams !== null
    && current.dose_grams !== null
    && Math.abs(candidate.dose_grams - current.dose_grams) <= 0.5
    && candidate.flow !== "channeling"
    && recipeIdentity(parseRecipeSnapshot(candidate.target_recipe_snapshot)) === targetKey;
}

function toPoint(shot: ShotWithBean, current: boolean): ShotComparisonPoint | null {
  const ratio = brewRatio(shot.final_yield_grams, shot.dose_grams);
  if (shot.extraction_seconds === null || ratio === null) return null;
  return {
    id: shot.id,
    date: formatShortDate(shot.shot_at),
    name: shot.beans?.name ?? (current ? "Dieser Shot" : "Shot"),
    time: shot.extraction_seconds,
    ratio,
    taste: shot.taste ?? "unknown",
    current,
    timestamp: Date.parse(shot.shot_at),
  };
}

function emptySeries(emptyReason: string): ShotComparisonSeries {
  return {
    current: null,
    peers: [],
    timeDomain: [0, 1],
    ratioDomain: [0.5, 1],
    targetArea: null,
    emptyReason,
  };
}
