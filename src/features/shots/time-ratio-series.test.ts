import { describe, expect, it } from "vitest";
import type { ShotSummary } from "@/types/domain";
import { buildTimeRatioSeries, OPTIMAL_RATIO_RANGE, OPTIMAL_TIME_RANGE } from "./time-ratio-series";

function shot(id: string, day: number, time: number | null, dose: number | null, finalWeight: number | null): ShotSummary {
  return {
    id,
    bean_id: `bean-${id}`,
    machine_id: "machine-1",
    grinder_id: "grinder-1",
    basket_id: null,
    shot_at: `2026-07-${String(day).padStart(2, "0")}T08:00:00Z`,
    grind_setting: "5",
    dose_grams: dose,
    extraction_seconds: time,
    stop_weight_grams: 34,
    final_yield_grams: finalWeight,
    taste: "balanced",
    flow: "even",
    score: null,
    score_coverage: null,
    target_recipe_snapshot: null,
    scoring_version: null,
    beans: { id: `bean-${id}`, name: `Bohne ${id}`, roaster: "Rösterei", roast_date: null, origin: null },
  };
}

describe("buildTimeRatioSeries", () => {
  it("bildet Zeit und Ratio der letzten vollständigen Shots chronologisch ab", () => {
    const series = buildTimeRatioSeries([
      shot("new", 14, 29, 18, 36),
      shot("invalid", 13, 28, null, 36),
      shot("old", 12, 24, 20, 38),
    ]);

    expect(series.points.map((point) => point.id)).toEqual(["old", "new"]);
    expect(series.points.map((point) => [point.time, point.ratio])).toEqual([[24, 1.9], [29, 2]]);
    expect(series.timeDomain[0]).toBeLessThan(OPTIMAL_TIME_RANGE[0]);
    expect(series.timeDomain[1]).toBeGreaterThan(OPTIMAL_TIME_RANGE[1]);
    expect(series.ratioDomain[0]).toBeLessThan(OPTIMAL_RATIO_RANGE[0]);
    expect(series.ratioDomain[1]).toBeGreaterThan(OPTIMAL_RATIO_RANGE[1]);
  });

  it("begrenzt die Serie auf die zehn neuesten vollständigen Shots", () => {
    const shots = Array.from({ length: 12 }, (_, index) => shot(`shot-${index + 1}`, index + 1, 25 + index, 18, 36));
    const series = buildTimeRatioSeries(shots);

    expect(series.points).toHaveLength(10);
    expect(series.points[0].id).toBe("shot-3");
    expect(series.points[9].id).toBe("shot-12");
  });

  it("liefert auch ohne Shots Achsen um den Optimalbereich", () => {
    const series = buildTimeRatioSeries([]);
    expect(series.points).toEqual([]);
    expect(series.timeDomain).toEqual([18, 32]);
    expect(series.ratioDomain).toEqual([1.8, 2.2]);
  });
});
