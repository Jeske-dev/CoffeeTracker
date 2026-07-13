export type BeanProcess = "washed" | "natural" | "honey" | "anaerobic" | "unknown";
export type RoastLevel = "light" | "medium_light" | "medium" | "dark";
export type EquipmentType = "machine" | "grinder" | "basket" | "tool";
export type ShotTaste = "very_sour" | "sour" | "balanced" | "bitter" | "very_bitter";
export type ShotFlow = "even" | "minor_channeling" | "channeling" | "spritzing";
export type PuckState = "dry" | "ideal" | "wet" | "stuck";

export type Bean = {
  id: string; user_id: string; name: string; roaster: string; roast_date: string | null;
  origin: string | null; process: BeanProcess; roast_level: RoastLevel | null;
  tasting_notes: string[]; purchase_date: string | null; price_cents: number | null;
  package_grams: number | null; is_decaf: boolean; archived_at: string | null;
  created_at: string; updated_at: string;
};

export type Equipment = {
  id: string; user_id: string; type: EquipmentType; name: string; notes: string | null;
  archived_at: string | null; created_at: string; updated_at: string;
};

export type Shot = {
  id: string; user_id: string; bean_id: string; machine_id: string | null; grinder_id: string | null;
  basket_id: string | null; shot_at: string; grind_setting: string | null; dose_grams: number | null;
  temperature_c: number | null; preinfusion_seconds: number | null; prep_tools: string[] | null;
  extraction_seconds: number | null; stop_weight_grams: number | null; final_yield_grams: number | null;
  taste: ShotTaste | null; flow: ShotFlow | null; puck: PuckState | null; notes: string | null; score: number | null;
  overall_taste_rating: number | null; tds: number | null; flow_evenness: number | null; channeling: boolean | null;
  score_coverage: number | null; score_status: "Geringe Aussagekraft" | "Vorläufig" | "Aussagekräftig" | "Sehr detailliert" | null;
  created_at: string; updated_at: string;
};

export type ShotWithBean = Shot & { beans: Pick<Bean, "id" | "name" | "roaster" | "roast_date"> | null };

export type UserSettings = {
  user_id: string; default_machine_id: string | null; default_grinder_id: string | null;
  last_bean_id: string | null; auto_fill: boolean; default_prep_tools: string[];
  dial_in_suggestions_enabled: boolean; roast_age_warning_enabled: boolean;
  roast_age_warning_days: number; created_at: string; updated_at: string;
};
