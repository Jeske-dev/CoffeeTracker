export type BeanProcess = "washed" | "natural" | "honey" | "anaerobic" | "unknown";
export type RoastLevel = "light" | "medium_light" | "medium" | "dark";
export type EquipmentType = "machine" | "grinder" | "basket" | "tool";
export type ShotTaste = "sour" | "balanced" | "bitter";
export type ShotFlow = "even" | "minor_channeling" | "channeling";
export type PuckState = "dry" | "ideal" | "wet" | "stuck";
export type GrindScaleType = "stepped" | "stepless";
export type FinerDirection = "higher" | "lower";

export type Bean = {
  id: string; user_id: string; name: string; roaster: string; roast_date: string | null;
  origin: string | null; process: BeanProcess; roast_level: RoastLevel | null;
  tasting_notes: string[]; purchase_date: string | null; price_cents: number | null;
  package_grams: number | null; is_decaf: boolean; archived_at: string | null;
  created_at: string; updated_at: string;
};

export type Equipment = {
  id: string; user_id: string; type: EquipmentType; name: string; notes: string | null;
  grind_scale_type?: GrindScaleType | null; minimum_setting?: number | null; maximum_setting?: number | null;
  micro_step?: number | null; finer_direction?: FinerDirection | null; clicks_per_rotation?: number | null;
  display_unit?: string | null; temperature_adjustable?: boolean | null; minimum_temperature?: number | null;
  maximum_temperature?: number | null; supports_preinfusion?: boolean | null; supports_pressure_adjustment?: boolean | null;
  nominal_dose_grams?: number | null; minimum_dose_grams?: number | null; maximum_dose_grams?: number | null;
  archived_at: string | null; created_at: string; updated_at: string;
};

export type Shot = {
  id: string; user_id: string; bean_id: string; machine_id: string | null; grinder_id: string | null;
  basket_id: string | null; shot_at: string; grind_setting: string | null; dose_grams: number | null;
  prep_tools: string[] | null; extraction_seconds: number | null; stop_weight_grams: number | null;
  final_yield_grams: number | null; taste: ShotTaste | null; flow: ShotFlow | null;
  puck: PuckState | null; notes: string | null; score: number | null; overall_taste_rating: number | null;
  target_recipe_snapshot: Record<string, unknown> | null; applied_recommendation_id: string | null;
  recommendation_applied: boolean | null; recommendation_changes: Record<string, unknown>[] | null;
  experiment_mode: boolean; scoring_version: string | null;
  score_coverage: number | null; score_status: "Geringe Aussagekraft" | "Vorläufig" | "Aussagekräftig" | "Sehr detailliert" | null;
  created_at: string; updated_at: string;
};

export type ShotWithBean = Shot & { beans: Pick<Bean, "id" | "name" | "roaster" | "roast_date" | "origin"> | null };

export type ShotSummary = Pick<Shot,
  "id" | "bean_id" | "machine_id" | "grinder_id" | "basket_id" | "shot_at" | "grind_setting" |
  "dose_grams" | "extraction_seconds" | "stop_weight_grams" | "final_yield_grams" | "taste" | "flow" |
  "score" | "score_coverage" | "target_recipe_snapshot" | "scoring_version"
> & { beans: Pick<Bean, "id" | "name" | "roaster" | "roast_date" | "origin"> | null };

export type UserSettings = {
  user_id: string; default_machine_id: string | null; default_grinder_id: string | null;
  last_bean_id: string | null; auto_fill: boolean; default_prep_tools: string[];
  dial_in_suggestions_enabled: boolean; roast_age_warning_enabled: boolean;
  roast_age_warning_days: number; reference_shot_id?: string | null; starter_recipe?: Record<string, unknown> | null;
  created_at: string; updated_at: string;
};

export type TargetRecipe = {
  id: string; user_id: string; bean_id: string | null; machine_id: string | null; grinder_id: string | null;
  basket_id: string | null; source_shot_id: string | null; name: string; recipe_snapshot: Record<string, unknown>;
  is_active: boolean; created_at: string; updated_at: string;
};

export type RecommendationBundleRecord = {
  id: string; user_id: string; source_shot_id: string; bean_id: string | null; machine_id: string | null;
  grinder_id: string | null; basket_id: string | null; target_recipe_snapshot: Record<string, unknown> | null;
  engine_version: string; primary_action: Record<string, unknown>; execution_adjustments: Record<string, unknown> | null;
  confidence: number; confidence_label: "Niedrige Sicherheit" | "Mittlere Sicherheit" | "Hohe Sicherheit";
  evidence: Record<string, unknown>[]; status: "active" | "applied" | "dismissed" | "superseded" | "completed";
  applied_at: string | null; dismissed_at: string | null; resulting_shot_id: string | null;
  user_feedback: "helpful" | "not_helpful" | null; outcome: Record<string, unknown> | null;
  created_at: string; updated_at: string;
};

export type RecommendationSuppression = {
  id: string; user_id: string; setup_key: string; bean_id: string | null; machine_id: string | null;
  grinder_id: string | null; basket_id: string | null; created_at: string;
};
