import { describe, expect, it } from "vitest";
import type { ShotWithBean } from "@/types/domain";
import { buildShotComparisonSeries } from "./comparison-series";

const targetRecipe = { doseGrams: 18, targetYieldGrams: 36, targetExtractionTimeSeconds: 30, grindSetting: "5", prepTools: ["WDT"] };
const current = shot({
  id: "current",
  shot_at: "2026-07-14T10:00:00Z",
  target_recipe_snapshot: targetRecipe,
});

describe("Shot-Vergleichsserie", () => {
  it("liefert nur vergleichbare Shots und sortiert sie chronologisch", () => {
    const older = shot({ id: "older", shot_at: "2026-07-12T10:00:00Z" });
    const newer = shot({ id: "newer", shot_at: "2026-07-13T10:00:00Z" });
    const channeling = shot({ id: "channeling", flow: "channeling" });
    const otherGrinder = shot({ id: "other", grinder_id: "other-grinder" });
    const result = buildShotComparisonSeries(current, [newer, channeling, otherGrinder, older, current]);

    expect(result.peers.map((point) => point.id)).toEqual(["older", "newer"]);
    expect(result.current?.id).toBe("current");
    expect(result.timeDomain[0]).toBeLessThan(30);
    expect(result.timeDomain[1]).toBeGreaterThan(30);
  });

  it("vergleicht Zielrezepte unabhängig von der JSON-Schlüsselreihenfolge", () => {
    const reordered = shot({
      id: "reordered",
      target_recipe_snapshot: { prepTools: ["WDT"], grindSetting: "5", targetExtractionTimeSeconds: 30, targetYieldGrams: 36, doseGrams: 18 },
    });
    expect(buildShotComparisonSeries(current, [reordered]).peers).toHaveLength(1);
  });

  it("liefert bei unvollständigen Kerndaten einen stabilen Empty State", () => {
    const result = buildShotComparisonSeries(shot({ id: "incomplete", extraction_seconds: null }), []);
    expect(result.current).toBeNull();
    expect(result.emptyReason).toContain("fehlen");
  });
});

function shot(overrides: Partial<ShotWithBean>): ShotWithBean {
  return {
    id: "peer",
    user_id: "user",
    bean_id: "bean",
    machine_id: "machine",
    grinder_id: "grinder",
    basket_id: "basket",
    shot_at: "2026-07-13T10:00:00Z",
    grind_setting: "5",
    dose_grams: 18,
    prep_tools: ["WDT"],
    extraction_seconds: 30,
    stop_weight_grams: 34,
    final_yield_grams: 36,
    taste: "balanced",
    flow: "even",
    puck: "ideal",
    notes: null,
    score: null,
    overall_taste_rating: 5,
    target_recipe_snapshot: targetRecipe,
    applied_recommendation_id: null,
    recommendation_applied: false,
    recommendation_changes: null,
    experiment_mode: false,
    scoring_version: "2.0.0-simple",
    score_coverage: 100,
    score_status: "Sehr detailliert",
    created_at: "",
    updated_at: "",
    beans: { id: "bean", name: "Test Bean", roaster: "Test", roast_date: null, origin: "Colombia" },
    ...overrides,
  };
}
