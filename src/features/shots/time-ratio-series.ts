import { brewRatio } from "@/lib/calculations";
import { formatShortDate } from "@/lib/formatting";
import type { ShotSummary } from "@/types/domain";

export const OPTIMAL_TIME_RANGE = [20, 30] as const;
export const OPTIMAL_RATIO_RANGE = [1.9, 2.1] as const;

export type TimeRatioPoint = {
  id: string;
  bean: string;
  date: string;
  time: number;
  ratio: number;
  taste: ShotSummary["taste"];
};

export type TimeRatioSeries = {
  points: TimeRatioPoint[];
  timeDomain: [number, number];
  ratioDomain: [number, number];
};

/** Reduces the newest shots to the values rendered by the dashboard chart. */
export function buildTimeRatioSeries(shots: readonly ShotSummary[]): TimeRatioSeries {
  const points = [...shots]
    .sort((left, right) => Date.parse(right.shot_at) - Date.parse(left.shot_at))
    .flatMap((shot) => {
      const ratio = brewRatio(shot.final_yield_grams, shot.dose_grams);
      if (shot.extraction_seconds === null || ratio === null) return [];
      return [{
        id: shot.id,
        bean: shot.beans?.name ?? "Unbekannte Bohne",
        date: formatShortDate(shot.shot_at),
        time: shot.extraction_seconds,
        ratio,
        taste: shot.taste,
      }];
    })
    .slice(0, 10)
    .reverse();

  return {
    points,
    timeDomain: numericDomain(
      [...points.map((point) => point.time), ...OPTIMAL_TIME_RANGE],
      2,
      0,
    ),
    ratioDomain: numericDomain(
      [...points.map((point) => point.ratio), ...OPTIMAL_RATIO_RANGE],
      0.1,
      0.5,
    ),
  };
}

function numericDomain(values: readonly number[], padding: number, minimum: number): [number, number] {
  const valueMin = Math.min(...values);
  const valueMax = Math.max(...values);
  const dynamicPadding = Math.max(padding, (valueMax - valueMin) * 0.1);
  const min = Math.max(minimum, Math.floor((valueMin - dynamicPadding) * 10) / 10);
  const max = Math.ceil((valueMax + dynamicPadding) * 10) / 10;
  return min === max ? [min, max + padding * 2] : [min, max];
}
