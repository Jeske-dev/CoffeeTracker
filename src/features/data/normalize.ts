import type { Shot, ShotFlow, ShotSummary, ShotTaste } from "@/types/domain";
import type { LegacyShotFlow, LegacyShotTaste, ShotRow } from "@/types/database";

export function normalizeShotTaste(value: LegacyShotTaste | null): ShotTaste | null {
  if (value === "very_sour") return "sour";
  if (value === "very_bitter") return "bitter";
  return value;
}

export function normalizeShotFlow(value: LegacyShotFlow | null): ShotFlow | null {
  return value === "spritzing" ? "channeling" : value;
}

export function toShot(row: ShotRow): Shot {
  return {
    id: row.id,
    user_id: row.user_id,
    bean_id: row.bean_id,
    machine_id: row.machine_id,
    grinder_id: row.grinder_id,
    basket_id: row.basket_id,
    shot_at: row.shot_at,
    grind_setting: row.grind_setting,
    dose_grams: row.dose_grams,
    prep_tools: row.prep_tools,
    extraction_seconds: row.extraction_seconds,
    stop_weight_grams: row.stop_weight_grams,
    final_yield_grams: row.final_yield_grams,
    taste: normalizeShotTaste(row.taste),
    flow: normalizeShotFlow(row.flow),
    puck: row.puck,
    notes: row.notes,
    score: row.score,
    overall_taste_rating: row.overall_taste_rating,
    target_recipe_snapshot: row.target_recipe_snapshot,
    applied_recommendation_id: row.applied_recommendation_id,
    recommendation_applied: row.recommendation_applied,
    recommendation_changes: row.recommendation_changes,
    experiment_mode: row.experiment_mode,
    scoring_version: row.scoring_version,
    score_coverage: row.score_coverage,
    score_status: row.score_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

type SummaryRow = Pick<ShotRow,
  "id" | "bean_id" | "machine_id" | "grinder_id" | "basket_id" | "shot_at" | "grind_setting" |
  "dose_grams" | "extraction_seconds" | "stop_weight_grams" | "final_yield_grams" | "taste" | "flow" |
  "score" | "score_coverage" | "target_recipe_snapshot" | "scoring_version"
>;

export function toShotSummary(row: SummaryRow): Omit<ShotSummary, "beans"> {
  return {
    ...row,
    taste: normalizeShotTaste(row.taste),
    flow: normalizeShotFlow(row.flow),
  };
}
