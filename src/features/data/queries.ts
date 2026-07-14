import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StopWeightHistoryShot } from "@/features/shots/stop-weight-tip";
import { createClient } from "@/lib/supabase/server";
import { measureServerOperation } from "@/lib/performance/server-timing";
import type { Database, ShotRow } from "@/types/database";
import type { Bean, Equipment, RecommendationBundleRecord, Shot, ShotSummary, ShotWithBean, UserSettings } from "@/types/domain";
import { BEAN_COLUMNS, EQUIPMENT_COLUMNS, PROFILE_COLUMNS, RECOMMENDATION_COLUMNS, SETTINGS_COLUMNS, SHOT_COLUMNS, SHOT_SUMMARY_COLUMNS } from "./columns";
import { toShot, toShotSummary } from "./normalize";
import { RECOMMENDATION_ENGINE_VERSION } from "@/features/recommendations/types";

type Client = SupabaseClient<Database>;
type Profile = { id: string; display_name: string; created_at: string };

function attachBeans<T extends { bean_id: string }>(shots: T[], beans: Pick<Bean, "id" | "name" | "roaster" | "roast_date" | "origin">[]) {
  const beanMap = new Map(beans.map((bean) => [bean.id, bean]));
  return shots.map((shot) => ({ ...shot, beans: beanMap.get(shot.bean_id) ?? null }));
}

async function clientOr(provided?: Client) { return provided ?? createClient(); }

export async function loadDashboardData(userId: string, provided?: Client) {
  return measureServerOperation("dashboard", 5, async () => {
    const supabase = await clientOr(provided);
    const [profile, settings, beans, shots, activeRecommendation] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle(),
      supabase.from("user_settings").select(SETTINGS_COLUMNS).eq("user_id", userId).maybeSingle(),
      supabase.from("beans").select("id,name,roaster,roast_date,origin,archived_at").eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("shots").select(SHOT_SUMMARY_COLUMNS).eq("user_id", userId).order("shot_at", { ascending: false }).limit(30),
      measureServerOperation("recommendation", 1, async () => supabase.from("recommendation_bundles").select(RECOMMENDATION_COLUMNS).eq("user_id", userId).eq("engine_version", RECOMMENDATION_ENGINE_VERSION).in("status", ["active", "applied"]).order("created_at", { ascending: false }).limit(1).maybeSingle()),
    ]);
    const beanRows = (beans.data ?? []) as Pick<Bean, "id" | "name" | "roaster" | "roast_date" | "origin" | "archived_at">[];
    return {
      profile: profile.data as Profile | null,
      settings: settings.data as UserSettings | null,
      beans: beanRows,
      shots: attachBeans((shots.data ?? []).map((row) => toShotSummary(row as unknown as Parameters<typeof toShotSummary>[0])), beanRows) as ShotSummary[],
      activeRecommendation: activeRecommendation.data as RecommendationBundleRecord | null,
      error: profile.error ?? settings.error ?? beans.error ?? shots.error ?? activeRecommendation.error,
    };
  });
}

export async function loadShotsPageData(userId: string, provided?: Client) {
  return measureServerOperation("shots", 2, async () => {
    const supabase = await clientOr(provided);
    const [beans, shots] = await Promise.all([
      supabase.from("beans").select("id,name,roaster,roast_date,origin").eq("user_id", userId),
      supabase.from("shots").select(SHOT_SUMMARY_COLUMNS).eq("user_id", userId).order("shot_at", { ascending: false }).limit(30),
    ]);
    const beanRows = (beans.data ?? []) as Pick<Bean, "id" | "name" | "roaster" | "roast_date" | "origin">[];
    return { beans: beanRows, shots: attachBeans((shots.data ?? []).map((row) => toShotSummary(row as unknown as Parameters<typeof toShotSummary>[0])), beanRows) as ShotSummary[], error: beans.error ?? shots.error };
  });
}

export async function loadBeansPageData(userId: string, provided?: Client) {
  return measureServerOperation("beans", 3, async () => {
    const supabase = await clientOr(provided);
    const [beans, settings, shotBeans] = await Promise.all([
      supabase.from("beans").select(BEAN_COLUMNS).eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("user_settings").select("last_bean_id").eq("user_id", userId).maybeSingle(),
      supabase.from("shots").select("bean_id").eq("user_id", userId).limit(1000),
    ]);
    const counts = (shotBeans.data ?? []).reduce<Record<string, number>>((result, shot) => { result[shot.bean_id] = (result[shot.bean_id] ?? 0) + 1; return result; }, {});
    return { beans: (beans.data ?? []) as Bean[], lastBeanId: settings.data?.last_bean_id ?? null, shotCounts: counts, error: beans.error ?? settings.error ?? shotBeans.error };
  });
}

export async function loadBeanDetailData(userId: string, beanId: string, provided?: Client) {
  return measureServerOperation("beans", 2, async () => {
    const supabase = await clientOr(provided);
    const [bean, shots] = await Promise.all([
      supabase.from("beans").select(BEAN_COLUMNS).eq("id", beanId).eq("user_id", userId).maybeSingle(),
      supabase.from("shots").select("id,bean_id,score").eq("bean_id", beanId).eq("user_id", userId).order("score", { ascending: false }).limit(100),
    ]);
    return { bean: bean.data as Bean | null, shots: (shots.data ?? []) as Pick<Shot, "id" | "bean_id" | "score">[], error: bean.error ?? shots.error };
  });
}

export async function loadSetupData(userId: string, provided?: Client) {
  return measureServerOperation("equipment", 3, async () => {
    const supabase = await clientOr(provided);
    const [profile, settings, equipment] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle(),
      supabase.from("user_settings").select(SETTINGS_COLUMNS).eq("user_id", userId).maybeSingle(),
      supabase.from("equipment").select(EQUIPMENT_COLUMNS).eq("user_id", userId).order("created_at", { ascending: true }),
    ]);
    return { profile: profile.data as Profile | null, settings: settings.data as UserSettings | null, equipment: (equipment.data ?? []) as Equipment[], error: profile.error ?? settings.error ?? equipment.error };
  });
}

export async function loadNewShotData(userId: string, provided?: Client) {
  return measureServerOperation("shots", 5, async () => {
    const supabase = await clientOr(provided);
    const [beans, equipment, settings, recentShotsResult, activeRecommendation] = await Promise.all([
      supabase.from("beans").select(BEAN_COLUMNS).eq("user_id", userId).is("archived_at", null).order("updated_at", { ascending: false }),
      supabase.from("equipment").select(EQUIPMENT_COLUMNS).eq("user_id", userId).is("archived_at", null).order("created_at", { ascending: true }),
      supabase.from("user_settings").select(SETTINGS_COLUMNS).eq("user_id", userId).maybeSingle(),
      supabase.from("shots").select(SHOT_COLUMNS).eq("user_id", userId).order("shot_at", { ascending: false }).limit(20),
      supabase.from("recommendation_bundles").select(RECOMMENDATION_COLUMNS).eq("user_id", userId).eq("engine_version", RECOMMENDATION_ENGINE_VERSION).in("status", ["active", "applied"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const recentShots = (recentShotsResult.data ?? []).map((shot) => toShot(shot as unknown as ShotRow));
    const stopWeightHistory: StopWeightHistoryShot[] = recentShots.map((shot) => ({
      id: shot.id,
      bean_id: shot.bean_id,
      grinder_id: shot.grinder_id,
      grind_setting: shot.grind_setting,
      stop_weight_grams: shot.stop_weight_grams,
      final_yield_grams: shot.final_yield_grams,
      shot_at: shot.shot_at,
    }));
    return {
      beans: (beans.data ?? []) as Bean[],
      equipment: (equipment.data ?? []) as Equipment[],
      settings: settings.data as UserSettings | null,
      latestShot: recentShots[0] ?? null,
      stopWeightHistory,
      activeRecommendation: activeRecommendation.data as RecommendationBundleRecord | null,
      error: beans.error ?? equipment.error ?? settings.error ?? recentShotsResult.error ?? activeRecommendation.error,
    };
  });
}

export async function loadShotDetailData(userId: string, shotId: string, provided?: Client) {
  return measureServerOperation("shot-detail", 4, async () => {
    const supabase = await clientOr(provided);
    const [shot, equipment, recentShots, beans] = await Promise.all([
      supabase.from("shots").select(SHOT_COLUMNS).eq("id", shotId).eq("user_id", userId).maybeSingle(),
      supabase.from("equipment").select("id,name,type").eq("user_id", userId),
      supabase.from("shots").select(SHOT_COLUMNS).eq("user_id", userId).order("shot_at", { ascending: false }).limit(20),
      supabase.from("beans").select("id,name,roaster,roast_date,origin").eq("user_id", userId),
    ]);
    const beanRows = (beans.data ?? []) as Pick<Bean, "id" | "name" | "roaster" | "roast_date" | "origin">[];
    const shotRows = attachBeans((recentShots.data ?? []).map((row) => toShot(row as unknown as ShotRow)), beanRows) as ShotWithBean[];
    const current = shot.data ? attachBeans([toShot(shot.data as unknown as ShotRow)], beanRows)[0] as ShotWithBean : null;
    return { shot: current, shots: shotRows, equipment: (equipment.data ?? []) as Pick<Equipment, "id" | "name" | "type">[], error: shot.error ?? equipment.error ?? recentShots.error ?? beans.error };
  });
}

export async function loadEditShotData(userId: string, shotId: string, provided?: Client) {
  return measureServerOperation("shot-detail", 3, async () => {
    const supabase = await clientOr(provided);
    const [shot, beans, equipment] = await Promise.all([
      supabase.from("shots").select(SHOT_COLUMNS).eq("id", shotId).eq("user_id", userId).maybeSingle(),
      supabase.from("beans").select(BEAN_COLUMNS).eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("equipment").select(EQUIPMENT_COLUMNS).eq("user_id", userId).order("created_at", { ascending: true }),
    ]);
    return { shot: shot.data ? toShot(shot.data as unknown as ShotRow) : null, beans: (beans.data ?? []) as Bean[], equipment: (equipment.data ?? []) as Equipment[], error: shot.error ?? beans.error ?? equipment.error };
  });
}
