import type { Bean, BeanProcess, Equipment, EquipmentType, PuckState, RecommendationBundleRecord, RecommendationSuppression, RoastLevel, Shot, TargetRecipe, UserSettings } from "./domain";

type Table<Row, Insert, Update = Partial<Insert>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export type LegacyShotTaste = "very_sour" | "sour" | "balanced" | "bitter" | "very_bitter";
export type LegacyShotFlow = "even" | "minor_channeling" | "channeling" | "spritzing";

// Supabase keeps historical diagnostics. App code crosses into the simplified Shot type at the query boundary.
export type ShotRow = Omit<Shot, "taste" | "flow"> & {
  taste: LegacyShotTaste | null;
  flow: LegacyShotFlow | null;
  temperature_c: number | null;
  preinfusion_seconds: number | null;
  tds: number | null;
  flow_evenness: number | null;
  channeling: boolean | null;
  first_drop_seconds: number | null;
  pressure_bar: number | null;
  taste_balance: number | null;
  sweetness: number | null;
  acidity_quality: number | null;
  bitterness_quality: number | null;
  body_rating: number | null;
  clarity_rating: number | null;
  aroma_rating: number | null;
  aftertaste_rating: number | null;
  astringency_severity: number | null;
  channeling_severity: number | null;
  spraying_severity: number | null;
  flow_evenness_rating: number | null;
  early_blonding_severity: number | null;
  puck_damage_severity: number | null;
  shower_screen_imprint: boolean | null;
  puck_screen_imprint: boolean | null;
  strength_perception: number | null;
  tamp_level: "level" | "slanted" | null;
};

type ShotInsert = Pick<ShotRow, "user_id" | "bean_id"> & Partial<Omit<ShotRow, "id" | "user_id" | "bean_id" | "created_at" | "updated_at">> & { id?: string };

export type Database = {
  public: {
    Tables: {
      profiles: Table<{ id: string; display_name: string; avatar_url: string | null; created_at: string; updated_at: string }, { id: string; display_name?: string; avatar_url?: string | null }>;
      beans: Table<Bean, Omit<Bean, "id" | "created_at" | "updated_at" | "archived_at"> & { id?: string; archived_at?: string | null }>;
      equipment: Table<Equipment, Omit<Equipment, "id" | "created_at" | "updated_at" | "archived_at" | "notes"> & { id?: string; notes?: string | null; archived_at?: string | null }>;
      user_settings: Table<UserSettings, Omit<UserSettings, "created_at" | "updated_at">>;
      shots: Table<ShotRow, ShotInsert>;
      target_recipes: Table<TargetRecipe, Omit<TargetRecipe, "id" | "created_at" | "updated_at"> & { id?: string }>;
      recommendation_bundles: Table<RecommendationBundleRecord, Omit<RecommendationBundleRecord, "id" | "created_at" | "updated_at"> & { id?: string }>;
      recommendation_suppressions: Table<RecommendationSuppression, Omit<RecommendationSuppression, "id" | "created_at"> & { id?: string }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { bean_process: BeanProcess; roast_level: RoastLevel; equipment_type: EquipmentType; shot_taste: LegacyShotTaste; shot_flow: LegacyShotFlow; puck_state: PuckState };
    CompositeTypes: Record<string, never>;
  };
};
