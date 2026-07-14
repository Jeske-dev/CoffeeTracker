"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { calculateDialedScore, SCORING_VERSION, scoreTargetFromSnapshot } from "@/lib/calculations";
import { requireUser } from "@/lib/supabase/auth";
import {
  beanSchema,
  shotEditSchema,
  shotSchema,
  type BeanInput,
  type ShotEditInput,
  type ShotInput,
} from "@/lib/validation";
import {
  completeAppliedRecommendation,
  generateAndStoreRecommendation,
  parseRecipeSnapshot,
  recipeFromShot,
  recommendationSetupKey,
} from "@/features/recommendations/repository";
import { recipeIdentity } from "@/features/recommendations/signals";
import { SHOT_COLUMNS, TARGET_RECIPE_COLUMNS } from "@/features/data/columns";
import { toShot } from "@/features/data/normalize";
import type { Database, ShotRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

export type MutationResult = {
  ok: boolean;
  message: string;
  id?: string;
  score?: number | null;
  coverage?: number;
  recommendationId?: string;
};

export async function saveBean(input: BeanInput): Promise<MutationResult> {
  const parsed = beanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { supabase, userId } = await requireUser();
  const data = parsed.data;
  const payload = {
    user_id: userId,
    name: data.name,
    roaster: data.roaster,
    roast_date: data.roastDate || null,
    origin: data.origin || null,
    process: data.process,
    roast_level: data.roastLevel,
    tasting_notes: (data.tastingNotes ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    purchase_date: data.purchaseDate || null,
    price_cents: data.priceEuros === null ? null : Math.round(data.priceEuros * 100),
    package_grams: data.packageGrams,
    is_decaf: data.isDecaf,
  };
  const result = data.id
    ? await supabase.from("beans").update(payload).eq("id", data.id).eq("user_id", userId).select("id").single()
    : await supabase.from("beans").insert(payload).select("id").single();
  if (result.error) {
    console.error("saveBean failed", { code: result.error.code });
    return { ok: false, message: "Die Bohne konnte nicht gespeichert werden." };
  }
  await supabase.from("user_settings").update({ last_bean_id: result.data.id }).eq("user_id", userId);
  revalidatePath("/app");
  revalidatePath("/app/beans");
  return { ok: true, message: data.id ? "Bohne aktualisiert" : "Bohne hinzugefügt", id: result.data.id };
}

export async function archiveBean(id: string, archive: boolean): Promise<MutationResult> {
  const valid = z.string().uuid().safeParse(id);
  if (!valid.success) return { ok: false, message: "Ungültige Bohne." };
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("beans").update({ archived_at: archive ? new Date().toISOString() : null }).eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, message: "Der Status konnte nicht geändert werden." };
  revalidatePath("/app/beans");
  return { ok: true, message: archive ? "Bohne archiviert" : "Bohne wiederhergestellt" };
}

const setupSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  machineName: z.string().trim().min(1).max(120),
  grinderName: z.string().trim().min(1).max(120),
  autoFill: z.boolean(),
  tools: z.array(z.string()).max(20),
  suggestions: z.boolean(),
  roastWarning: z.boolean(),
  warningDays: z.number().int().min(1).max(365),
});

export async function saveSetup(input: z.infer<typeof setupSchema>): Promise<MutationResult> {
  const parsed = setupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Bitte prüfe die Setup-Angaben." };
  const { supabase, userId } = await requireUser();
  const currentSettings = await supabase.from("user_settings").select("last_bean_id").eq("user_id", userId).maybeSingle();
  if (currentSettings.error) return { ok: false, message: "Die bisherigen Einstellungen konnten nicht geladen werden." };
  const upsertEquipment = async (type: "machine" | "grinder", name: string) => {
    const existing = await supabase.from("equipment").select("id").eq("user_id", userId).eq("type", type).ilike("name", name).is("archived_at", null).maybeSingle();
    if (existing.error) {
      console.error("load equipment failed", { type, code: existing.error.code });
      return null;
    }
    if (existing.data) return existing.data.id;
    const created = await supabase.from("equipment").insert({ user_id: userId, type, name }).select("id").single();
    if (created.error) console.error("create equipment failed", { type, code: created.error.code });
    return created.data?.id ?? null;
  };
  const [machineId, grinderId] = await Promise.all([
    upsertEquipment("machine", parsed.data.machineName),
    upsertEquipment("grinder", parsed.data.grinderName),
  ]);
  if (!machineId || !grinderId) return { ok: false, message: "Das Equipment konnte nicht gespeichert werden." };
  const settingsPayload = {
    user_id: userId,
    default_machine_id: machineId,
    default_grinder_id: grinderId,
    last_bean_id: currentSettings.data?.last_bean_id ?? null,
    auto_fill: parsed.data.autoFill,
    default_prep_tools: parsed.data.tools,
    dial_in_suggestions_enabled: parsed.data.suggestions,
    roast_age_warning_enabled: parsed.data.roastWarning,
    roast_age_warning_days: parsed.data.warningDays,
  };
  const [profile, settings] = await Promise.all([
    supabase.from("profiles").update({ display_name: parsed.data.displayName }).eq("id", userId),
    supabase.from("user_settings").upsert(settingsPayload, { onConflict: "user_id" }).select("default_machine_id,default_grinder_id").single(),
  ]);
  if (profile.error || settings.error || settings.data?.default_machine_id !== machineId || settings.data?.default_grinder_id !== grinderId) {
    console.error("save setup failed", { profileCode: profile.error?.code, settingsCode: settings.error?.code });
    return { ok: false, message: "Das Setup konnte nicht vollständig gespeichert werden." };
  }
  revalidatePath("/app", "layout");
  revalidatePath("/app/setup");
  return { ok: true, message: "Setup wurde gespeichert" };
}

const STARTER_RECIPE = {
  doseGrams: 18,
  targetYieldGrams: 36,
  targetExtractionTimeSeconds: 30,
  grindSetting: null,
  prepTools: ["WDT"],
};

async function validateShotRefs(supabase: Client, userId: string, data: ShotInput) {
  const ids = [data.machineId, data.grinderId, data.basketId].filter((id): id is string => Boolean(id));
  const [bean, equipment] = await Promise.all([
    supabase.from("beans").select("id,name").eq("id", data.beanId).eq("user_id", userId).maybeSingle(),
    ids.length
      ? supabase.from("equipment").select("id").eq("user_id", userId).in("id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);
  return { bean, equipmentOk: (equipment.data ?? []).length === ids.length };
}

async function resolveTargetSnapshot(supabase: Client, userId: string, data: ShotInput) {
  if (data.targetRecipeSnapshot) return data.targetRecipeSnapshot;
  const [recipes, settings] = await Promise.all([
    supabase.from("target_recipes").select(TARGET_RECIPE_COLUMNS).eq("user_id", userId).eq("is_active", true),
    supabase.from("user_settings").select("reference_shot_id,starter_recipe").eq("user_id", userId).maybeSingle(),
  ]);
  const active = recipes.data?.find((recipe) =>
    recipe.bean_id === data.beanId &&
    recipe.machine_id === data.machineId &&
    recipe.grinder_id === data.grinderId &&
    recipe.basket_id === data.basketId,
  );
  if (active?.recipe_snapshot) return active.recipe_snapshot;
  if (settings.data?.reference_shot_id) {
    const reference = await supabase.from("shots").select(SHOT_COLUMNS).eq("id", settings.data.reference_shot_id).eq("user_id", userId).maybeSingle();
    if (reference.data) return recipeFromShot(toShot(reference.data as unknown as ShotRow)) as unknown as Record<string, unknown>;
  }
  return settings.data?.starter_recipe ?? STARTER_RECIPE;
}

async function loadComparableScoreShots(
  supabase: Client,
  userId: string,
  data: ShotInput,
  targetRecipeSnapshot: Record<string, unknown>,
  excludeShotId?: string,
) {
  const result = await supabase.from("shots")
    .select("id,bean_id,machine_id,grinder_id,basket_id,target_recipe_snapshot,dose_grams,final_yield_grams,extraction_seconds")
    .eq("user_id", userId)
    .eq("bean_id", data.beanId)
    .order("shot_at", { ascending: false })
    .limit(50);
  const targetKey = recipeIdentity(parseRecipeSnapshot(targetRecipeSnapshot));
  return (result.data ?? []).filter((shot) =>
    shot.id !== excludeShotId &&
    shot.machine_id === data.machineId &&
    shot.grinder_id === data.grinderId &&
    shot.basket_id === data.basketId &&
    recipeIdentity(parseRecipeSnapshot(shot.target_recipe_snapshot)) === targetKey,
  ).slice(0, 10).map((shot) => ({
    doseGrams: shot.dose_grams,
    finalYieldGrams: shot.final_yield_grams,
    extractionSeconds: shot.extraction_seconds,
  }));
}

async function buildShotPayload(
  supabase: Client,
  userId: string,
  data: ShotInput,
  targetRecipeSnapshot: Record<string, unknown>,
  shotAt?: string,
  excludeShotId?: string,
) {
  const previousComparableShots = await loadComparableScoreShots(supabase, userId, data, targetRecipeSnapshot, excludeShotId);
  const scoreResult = calculateDialedScore({
    doseGrams: data.doseGrams,
    finalYieldGrams: data.finalYieldGrams,
    extractionSeconds: data.extractionSeconds,
    overallTasteRating: data.overallTasteRating,
    tasteBalance: data.taste,
    extractionPicture: data.flow,
    targetRecipe: scoreTargetFromSnapshot(targetRecipeSnapshot),
    previousComparableShots,
  });
  const prepTools = [...new Set((data.prepTools ?? []).filter((tool) => tool === "WDT" || tool === "Puck Screen"))];
  return {
    payload: {
      user_id: userId,
      bean_id: data.beanId,
      machine_id: data.machineId,
      grinder_id: data.grinderId,
      basket_id: data.basketId,
      shot_at: new Date(shotAt ?? Date.now()).toISOString(),
      grind_setting: data.grindSetting,
      dose_grams: data.doseGrams,
      prep_tools: prepTools,
      extraction_seconds: data.extractionSeconds,
      stop_weight_grams: data.stopWeightGrams,
      final_yield_grams: data.finalYieldGrams,
      taste: data.taste,
      flow: data.flow,
      puck: data.puck,
      notes: data.notes || null,
      overall_taste_rating: data.overallTasteRating,
      target_recipe_snapshot: targetRecipeSnapshot,
      applied_recommendation_id: data.recommendationApplied ? data.recommendationBundleId ?? null : null,
      recommendation_applied: data.recommendationApplied ?? false,
      recommendation_changes: data.recommendationChanges ?? null,
      experiment_mode: data.experimentMode ?? false,
      score: scoreResult.score,
      scoring_version: SCORING_VERSION,
      score_coverage: scoreResult.coverage,
      score_status: scoreResult.coverageLabel,
    },
    scoreResult,
  };
}

function scoreMessage(beanName: string, result: ReturnType<typeof calculateDialedScore>) {
  if (result.score !== null) return `${beanName} · ${result.score} Punkte · ${result.coverage}% Datenabdeckung`;
  if (result.missingTasteEvaluation) return `${beanName} · Für einen vollständigen Score fehlt noch eine kurze Geschmacksbewertung.`;
  return `${beanName} · Score noch nicht vollständig · ${result.coverage}% Datenabdeckung`;
}

export async function saveShot(input: ShotInput): Promise<MutationResult> {
  const parsed = shotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { supabase, userId } = await requireUser();
  const data = parsed.data;
  const { bean, equipmentOk } = await validateShotRefs(supabase, userId, data);
  if (!bean.data || !equipmentOk) return { ok: false, message: "Bohne oder Equipment gehören nicht zu deinem Konto." };
  const targetRecipeSnapshot = await resolveTargetSnapshot(supabase, userId, data);
  const { payload, scoreResult } = await buildShotPayload(supabase, userId, data, targetRecipeSnapshot);
  const { data: rawShot, error } = await supabase.from("shots").insert(payload).select(SHOT_COLUMNS).single();
  if (error || !rawShot) {
    console.error("saveShot failed", { code: error?.code });
    return { ok: false, message: "Der Shot konnte nicht gespeichert werden." };
  }
  const shot = toShot(rawShot as unknown as ShotRow);
  await supabase.from("user_settings").update({ last_bean_id: data.beanId }).eq("user_id", userId);
  after(async () => {
    try {
      if (data.recommendationApplied && data.recommendationBundleId) {
        await completeAppliedRecommendation(
          supabase,
          userId,
          data.recommendationBundleId,
          shot,
          data.recommendationChanges?.filter((change) => change.manual).length ?? 0,
        );
      }
      await generateAndStoreRecommendation(supabase, userId, shot.id);
      revalidatePath("/app");
    } catch (recommendationError) {
      console.error("generateRecommendation failed", { code: (recommendationError as { code?: string }).code });
    }
  });
  revalidatePath("/app");
  revalidatePath("/app/shots");
  revalidatePath("/app/beans");
  return {
    ok: true,
    message: scoreMessage(bean.data.name, scoreResult),
    id: shot.id,
    score: scoreResult.score,
    coverage: scoreResult.coverage,
  };
}

export async function updateShot(id: string, input: ShotEditInput): Promise<MutationResult> {
  const validId = z.string().uuid().safeParse(id);
  if (!validId.success) return { ok: false, message: "Ungültiger Shot." };
  const parsed = shotEditSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { supabase, userId } = await requireUser();
  const data = parsed.data;
  const { bean, equipmentOk } = await validateShotRefs(supabase, userId, data);
  if (!bean.data || !equipmentOk) return { ok: false, message: "Bohne oder Equipment gehören nicht zu deinem Konto." };
  const existing = await supabase.from("shots").select("target_recipe_snapshot").eq("id", validId.data).eq("user_id", userId).maybeSingle();
  const targetRecipeSnapshot = data.targetRecipeSnapshot ?? existing.data?.target_recipe_snapshot ?? await resolveTargetSnapshot(supabase, userId, data);
  const { payload, scoreResult } = await buildShotPayload(supabase, userId, data, targetRecipeSnapshot, data.shotAt, validId.data);
  const { data: rawShot, error } = await supabase.from("shots")
    .update(payload)
    .eq("id", validId.data)
    .eq("user_id", userId)
    .select(SHOT_COLUMNS)
    .single();
  if (error || !rawShot) {
    console.error("updateShot failed", { code: error?.code });
    return { ok: false, message: "Der Shot konnte nicht aktualisiert werden." };
  }
  const shot = toShot(rawShot as unknown as ShotRow);
  await Promise.all([
    supabase.from("user_settings").update({ last_bean_id: data.beanId }).eq("user_id", userId),
    supabase.from("recommendation_bundles").update({ status: "superseded" }).eq("user_id", userId).eq("source_shot_id", shot.id).in("status", ["active", "applied"]),
  ]);
  try {
    await generateAndStoreRecommendation(supabase, userId, shot.id, { force: true });
  } catch (recommendationError) {
    console.error("regenerateRecommendation failed", { code: (recommendationError as { code?: string }).code });
  }
  revalidatePath("/app");
  revalidatePath("/app/shots");
  revalidatePath(`/app/shots/${validId.data}`);
  revalidatePath(`/app/shots/${validId.data}/edit`);
  revalidatePath("/app/beans");
  return {
    ok: true,
    message: scoreMessage(bean.data.name, scoreResult),
    id: shot.id,
    score: scoreResult.score,
    coverage: scoreResult.coverage,
  };
}

export async function deleteShot(id: string): Promise<MutationResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Ungültiger Shot." };
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("shots").delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, message: "Der Shot konnte nicht gelöscht werden." };
  revalidatePath("/app");
  revalidatePath("/app/shots");
  return { ok: true, message: "Shot gelöscht", id };
}

export async function applyRecommendation(id: string): Promise<MutationResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Ungültige Empfehlung." };
  const { supabase, userId } = await requireUser();
  await supabase.from("recommendation_bundles").update({ status: "superseded" }).eq("user_id", userId).eq("status", "applied").neq("id", id);
  const { data, error } = await supabase.from("recommendation_bundles")
    .update({ status: "applied", applied_at: new Date().toISOString(), dismissed_at: null })
    .eq("id", id)
    .eq("user_id", userId)
    .in("status", ["active", "applied"])
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "Die Empfehlung konnte nicht übernommen werden." };
  revalidatePath("/app");
  return { ok: true, message: "Für den nächsten Shot übernommen", id: data.id };
}

export async function dismissRecommendation(id: string): Promise<MutationResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Ungültige Empfehlung." };
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("recommendation_bundles")
    .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .in("status", ["active", "applied"]);
  if (error) return { ok: false, message: "Die Empfehlung konnte nicht ausgeblendet werden." };
  revalidatePath("/app");
  return { ok: true, message: "Tipp ausgeblendet" };
}

export async function suppressRecommendationSetup(id: string): Promise<MutationResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Ungültige Empfehlung." };
  const { supabase, userId } = await requireUser();
  const recommendation = await supabase.from("recommendation_bundles").select("bean_id,machine_id,grinder_id,basket_id").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!recommendation.data) return { ok: false, message: "Die Empfehlung wurde nicht gefunden." };
  const setup = {
    beanId: recommendation.data.bean_id,
    machineId: recommendation.data.machine_id,
    grinderId: recommendation.data.grinder_id,
    basketId: recommendation.data.basket_id,
  };
  const { error } = await supabase.from("recommendation_suppressions").upsert({
    user_id: userId,
    setup_key: recommendationSetupKey(setup),
    bean_id: setup.beanId,
    machine_id: setup.machineId,
    grinder_id: setup.grinderId,
    basket_id: setup.basketId,
  }, { onConflict: "user_id,setup_key" });
  if (error) return { ok: false, message: "Das Setup konnte nicht stummgeschaltet werden." };
  await supabase.from("recommendation_bundles").update({ status: "dismissed", dismissed_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  revalidatePath("/app");
  return { ok: true, message: "Für dieses Setup werden keine Tipps mehr angezeigt" };
}

export async function saveReferenceRecipe(shotId: string): Promise<MutationResult> {
  const parsed = z.string().uuid().safeParse(shotId);
  if (!parsed.success) return { ok: false, message: "Ungültiger Shot." };
  const { supabase, userId } = await requireUser();
  const { data: rawShot, error } = await supabase.from("shots").select(SHOT_COLUMNS).eq("id", shotId).eq("user_id", userId).single();
  if (error || !rawShot) return { ok: false, message: "Der Shot konnte nicht als Referenz geladen werden." };
  const shot = toShot(rawShot as unknown as ShotRow);
  const existing = await supabase.from("target_recipes").select("id,bean_id,machine_id,grinder_id,basket_id").eq("user_id", userId).eq("is_active", true);
  const matching = (existing.data ?? []).filter((recipe) =>
    recipe.bean_id === shot.bean_id &&
    recipe.machine_id === shot.machine_id &&
    recipe.grinder_id === shot.grinder_id &&
    recipe.basket_id === shot.basket_id,
  ).map((recipe) => recipe.id);
  if (matching.length) await supabase.from("target_recipes").update({ is_active: false }).in("id", matching).eq("user_id", userId);
  const { error: insertError } = await supabase.from("target_recipes").insert({
    user_id: userId,
    bean_id: shot.bean_id,
    machine_id: shot.machine_id,
    grinder_id: shot.grinder_id,
    basket_id: shot.basket_id,
    source_shot_id: shot.id,
    name: "Referenzrezept",
    recipe_snapshot: recipeFromShot(shot) as unknown as Record<string, unknown>,
    is_active: true,
  });
  if (insertError) return { ok: false, message: "Das Referenzrezept konnte nicht gespeichert werden." };
  await supabase.from("user_settings").update({ reference_shot_id: shot.id }).eq("user_id", userId);
  revalidatePath("/app");
  revalidatePath(`/app/shots/${shot.id}`);
  return { ok: true, message: "Als Referenzrezept gespeichert" };
}

export async function rateRecommendation(id: string, helpful: boolean): Promise<MutationResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Ungültige Empfehlung." };
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("recommendation_bundles").update({ user_feedback: helpful ? "helpful" : "not_helpful" }).eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, message: "Deine Rückmeldung konnte nicht gespeichert werden." };
  revalidatePath("/app/shots");
  return { ok: true, message: "Danke für deine Rückmeldung" };
}
