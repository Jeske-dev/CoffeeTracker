import type { Bean, BeanProcess, Equipment, EquipmentType, PuckState, RoastLevel, Shot, ShotFlow, ShotTaste, UserSettings } from "./domain";

type Table<Row, Insert, Update = Partial<Insert>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: Table<{ id: string; display_name: string; avatar_url: string | null; created_at: string; updated_at: string }, { id: string; display_name?: string; avatar_url?: string | null }>;
      beans: Table<Bean, Omit<Bean, "id" | "created_at" | "updated_at" | "archived_at"> & { id?: string; archived_at?: string | null }>;
      equipment: Table<Equipment, Omit<Equipment, "id" | "created_at" | "updated_at" | "archived_at" | "notes"> & { id?: string; notes?: string | null; archived_at?: string | null }>;
      user_settings: Table<UserSettings, Omit<UserSettings, "created_at" | "updated_at">>;
      shots: Table<Shot, Omit<Shot, "id" | "created_at" | "updated_at"> & { id?: string }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { bean_process: BeanProcess; roast_level: RoastLevel; equipment_type: EquipmentType; shot_taste: ShotTaste; shot_flow: ShotFlow; puck_state: PuckState };
    CompositeTypes: Record<string, never>;
  };
};
