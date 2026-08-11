import { describe, expect, it } from "vitest";
import { normalizeShotFlow, normalizeShotTaste, toShot } from "./normalize";
import type { ShotRow } from "@/types/database";

describe("Shot-Datenbankgrenze", () => {
  it("übersetzt historische Enum-Werte in das vereinfachte Modell", () => {
    expect(normalizeShotTaste("very_sour")).toBe("sour");
    expect(normalizeShotTaste("very_bitter")).toBe("bitter");
    expect(normalizeShotFlow("spritzing")).toBe("channeling");
  });

  it("lässt Legacy-Diagnosen nicht in das App-Domain-Modell gelangen", () => {
    const row = {
      id: "shot-1",
      user_id: "user-1",
      bean_id: "bean-1",
      machine_id: null,
      grinder_id: null,
      basket_id: null,
      shot_at: "2026-07-13T08:00:00Z",
      grind_setting: "5",
      dose_grams: 18,
      prep_tools: ["WDT"],
      extraction_seconds: 30,
      stop_weight_grams: 34,
      final_yield_grams: 36,
      taste: "very_sour",
      flow: "spritzing",
      puck: "ideal",
      notes: null,
      score: 80,
      overall_taste_rating: 4,
      target_recipe_snapshot: null,
      applied_recommendation_id: null,
      recommendation_applied: false,
      recommendation_changes: null,
      experiment_mode: false,
      scoring_version: null,
      score_coverage: 100,
      score_status: "Sehr detailliert",
      pressure_bar: 9,
      first_drop_seconds: 7,
      astringency_severity: 3,
      created_at: "",
      updated_at: "",
    } as unknown as ShotRow;

    const shot = toShot(row);
    expect(shot.taste).toBe("sour");
    expect(shot.flow).toBe("channeling");
    expect(shot).not.toHaveProperty("pressure_bar");
    expect(shot).not.toHaveProperty("first_drop_seconds");
    expect(shot).not.toHaveProperty("astringency_severity");
  });
});
