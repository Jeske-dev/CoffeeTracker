import { describe, expect, it } from "vitest";
import type { ShotSummary } from "@/types/domain";
import { grindTimePoints } from "./grind-time-chart";

function shot(id: string, beanId: string, grinderId: string | null, grind: string | null, time: number | null, day: number): ShotSummary {
  return {
    id,
    bean_id: beanId,
    machine_id: "machine-1",
    grinder_id: grinderId,
    basket_id: null,
    shot_at: `2026-07-${String(day).padStart(2, "0")}T08:00:00Z`,
    grind_setting: grind,
    dose_grams: 18,
    extraction_seconds: time,
    stop_weight_grams: 34,
    final_yield_grams: 36,
    taste: "balanced",
    flow: "even",
    score: null,
    score_coverage: null,
    target_recipe_snapshot: null,
    scoring_version: null,
    beans: { id: beanId, name: `Bohne ${beanId}`, roaster: "Rösterei", roast_date: null, origin: null },
  };
}

describe("grindTimePoints", () => {
  it("vergleicht bevorzugt dieselbe Bohne und Mühle und sortiert chronologisch", () => {
    const points = grindTimePoints([
      shot("new", "bean-a", "grinder-a", "5.2", 29, 14),
      shot("other-bean", "bean-b", "grinder-a", "5.1", 27, 13),
      shot("old", "bean-a", "grinder-a", "5.4", 25, 12),
      shot("invalid", "bean-a", "grinder-a", "stufenlos", 30, 11),
    ]);

    expect(points.map((point) => point.id)).toEqual(["old", "new"]);
    expect(points.map((point) => [point.grind, point.time])).toEqual([[5.4, 25], [5.2, 29]]);
  });

  it("fällt bei nur einem passenden Bohnen-Shot auf dieselbe Mühle zurück", () => {
    const points = grindTimePoints([
      shot("new", "bean-a", "grinder-a", "5", 30, 14),
      shot("same-grinder", "bean-b", "grinder-a", "6", 24, 13),
      shot("other-grinder", "bean-a", "grinder-b", "4", 32, 12),
    ]);

    expect(points.map((point) => point.id)).toEqual(["same-grinder", "new"]);
  });
});
