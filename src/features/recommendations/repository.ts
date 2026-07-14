import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateDialedScore } from "@/lib/calculations";
import { measureServerOperation } from "@/lib/performance/server-timing";
import { EQUIPMENT_COLUMNS, RECOMMENDATION_COLUMNS, SETTINGS_COLUMNS, SHOT_COLUMNS, TARGET_RECIPE_COLUMNS } from "@/features/data/columns";
import { toShot } from "@/features/data/normalize";
import type { Database, ShotRow } from "@/types/database";
import type { Equipment, RecommendationBundleRecord, Shot, TargetRecipe, UserSettings } from "@/types/domain";
import { generateRecommendation } from "./engine";
import { calculateOutcome, personalEffectiveness } from "./outcome";
import { parseRecipeSnapshot } from "./recipe";
import {
  RECOMMENDATION_ENGINE_VERSION,
  type RecipeSnapshot,
  type RecommendationActionType,
  type RecommendationShot,
} from "./types";

type Client = SupabaseClient<Database>;

export function recommendationSetupKey(setup: {
  beanId: string | null;
  machineId: string | null;
  grinderId: string | null;
  basketId: string | null;
}) {
  return [setup.beanId, setup.machineId, setup.grinderId, setup.basketId].map((value) => value ?? "none").join(":");
}

export function recipeFromShot(shot: Shot): RecipeSnapshot {
  return {
    doseGrams: shot.dose_grams,
    targetYieldGrams: shot.final_yield_grams,
    targetExtractionTimeSeconds: shot.extraction_seconds,
    grindSetting: shot.grind_setting,
    prepTools: shot.prep_tools,
  };
}

export function toRecommendationShot(shot: Shot): RecommendationShot {
  const prepTools = (shot.prep_tools ?? []).filter((tool) => tool === "WDT" || tool === "Puck Screen");
  return {
    id: shot.id,
    beanId: shot.bean_id,
    machineId: shot.machine_id,
    grinderId: shot.grinder_id,
    basketId: shot.basket_id,
    targetRecipeSnapshot: parseRecipeSnapshot(shot.target_recipe_snapshot),
    doseGrams: shot.dose_grams,
    finalYieldGrams: shot.final_yield_grams,
    stopWeightGrams: shot.stop_weight_grams,
    extractionTimeSeconds: shot.extraction_seconds,
    grindSetting: shot.grind_setting,
    prepTools,
    overallTasteRating: shot.overall_taste_rating,
    taste: shot.taste,
    extractionPicture: shot.flow,
    puck: shot.puck,
    appliedRecommendationId: shot.applied_recommendation_id,
    score: shot.score,
  };
}

function isKnownAction(value: string | undefined): value is RecommendationActionType {
  return [
    "KEEP_RECIPE", "GRIND_FINER", "GRIND_COARSER", "INCREASE_YIELD", "DECREASE_YIELD",
    "USE_WDT", "IMPROVE_WDT", "INCREASE_DOSE", "DECREASE_DOSE", "COLLECT_MORE_DATA", "ADJUST_STOP_WEIGHT",
  ].includes(value ?? "");
}

export async function generateAndStoreRecommendation(
  supabase: Client,
  userId: string,
  shotId: string,
  options: { force?: boolean } = {},
) {
  return measureServerOperation("recommendation", 8, async () => {
    if (!options.force) {
      const existing = await supabase.from("recommendation_bundles")
        .select(RECOMMENDATION_COLUMNS)
        .eq("source_shot_id", shotId)
        .eq("user_id", userId)
        .eq("engine_version", RECOMMENDATION_ENGINE_VERSION)
        .maybeSingle();
      if (existing.data) return existing.data as RecommendationBundleRecord;
    }

    const [shotResult, historyResult, equipmentResult, settingsResult, recipesResult, previousResult, suppressionsResult] = await Promise.all([
      supabase.from("shots").select(SHOT_COLUMNS).eq("id", shotId).eq("user_id", userId).single(),
      supabase.from("shots").select(SHOT_COLUMNS).eq("user_id", userId).order("shot_at", { ascending: false }).limit(50),
      supabase.from("equipment").select(EQUIPMENT_COLUMNS).eq("user_id", userId),
      supabase.from("user_settings").select(SETTINGS_COLUMNS).eq("user_id", userId).maybeSingle(),
      supabase.from("target_recipes").select(TARGET_RECIPE_COLUMNS).eq("user_id", userId).eq("is_active", true),
      supabase.from("recommendation_bundles").select(RECOMMENDATION_COLUMNS).eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      supabase.from("recommendation_suppressions").select("setup_key").eq("user_id", userId),
    ]);
    if (shotResult.error || !shotResult.data) throw shotResult.error ?? new Error("Shot fehlt");

    const shot = toShot(shotResult.data as unknown as ShotRow);
    const history = (historyResult.data ?? []).map((row) => toShot(row as unknown as ShotRow));
    const equipment = (equipmentResult.data ?? []) as Equipment[];
    const settings = settingsResult.data as UserSettings | null;
    const active = ((recipesResult.data ?? []) as TargetRecipe[]).find((recipe) =>
      recipe.bean_id === shot.bean_id &&
      recipe.machine_id === shot.machine_id &&
      recipe.grinder_id === shot.grinder_id &&
      recipe.basket_id === shot.basket_id,
    );
    const referenceShot = settings?.reference_shot_id ? history.find((item) => item.id === settings.reference_shot_id) : null;
    const grinder = equipment.find((item) => item.id === shot.grinder_id);
    const basket = equipment.find((item) => item.id === shot.basket_id);
    const prior = (previousResult.data ?? []) as RecommendationBundleRecord[];
    const actionTypes = [...new Set(prior.map((item) => (item.primary_action as { actionType?: string }).actionType).filter(isKnownAction))];
    const effectiveness = Object.fromEntries(actionTypes.map((action) => {
      const evaluable = prior.filter((item) =>
        (item.primary_action as { actionType?: string }).actionType === action &&
        ["successful", "unsuccessful"].includes((item.outcome as { status?: string } | null)?.status ?? ""),
      );
      const successful = evaluable.filter((item) => (item.outcome as { status?: string } | null)?.status === "successful").length;
      return [action, personalEffectiveness(successful, evaluable.length)];
    })) as Partial<Record<RecommendationActionType, number>>;

    const bundle = generateRecommendation({
      shot: toRecommendationShot(shot),
      history: history.map(toRecommendationShot),
      activeRecipe: parseRecipeSnapshot(active?.recipe_snapshot),
      referenceRecipe: referenceShot ? recipeFromShot(referenceShot) : null,
      starterRecipe: parseRecipeSnapshot(settings?.starter_recipe),
      grinder: grinder ? {
        grindScaleType: grinder.grind_scale_type ?? null,
        minimumSetting: grinder.minimum_setting ?? null,
        maximumSetting: grinder.maximum_setting ?? null,
        microStep: grinder.micro_step ?? null,
        finerDirection: grinder.finer_direction ?? null,
        displayUnit: grinder.display_unit ?? null,
      } : null,
      basket: basket ? {
        nominalDoseGrams: basket.nominal_dose_grams ?? null,
        minimumDoseGrams: basket.minimum_dose_grams ?? null,
        maximumDoseGrams: basket.maximum_dose_grams ?? null,
      } : null,
      personalEffectiveness: effectiveness,
    });
    const setupKey = recommendationSetupKey({
      beanId: shot.bean_id,
      machineId: shot.machine_id,
      grinderId: shot.grinder_id,
      basketId: shot.basket_id,
    });
    const suppressed = (suppressionsResult.data ?? []).some((item) => item.setup_key === setupKey);
    const now = new Date().toISOString();
    const row = {
      user_id: userId,
      source_shot_id: shot.id,
      bean_id: shot.bean_id,
      machine_id: shot.machine_id,
      grinder_id: shot.grinder_id,
      basket_id: shot.basket_id,
      target_recipe_snapshot: bundle.targetRecipeSnapshot as unknown as Record<string, unknown> | null,
      engine_version: bundle.engineVersion,
      primary_action: bundle.primary as unknown as Record<string, unknown>,
      execution_adjustments: bundle.executionAdjustment as unknown as Record<string, unknown> | null,
      confidence: bundle.primary.confidence,
      confidence_label: bundle.primary.confidence < 0.45 ? "Niedrige Sicherheit" as const : bundle.primary.confidence < 0.75 ? "Mittlere Sicherheit" as const : "Hohe Sicherheit" as const,
      evidence: bundle.primary.evidence as unknown as Record<string, unknown>[],
      status: suppressed ? "dismissed" as const : "active" as const,
      applied_at: null,
      dismissed_at: suppressed ? now : null,
      resulting_shot_id: null,
      user_feedback: null,
      outcome: null,
    };

    await supabase.from("recommendation_bundles")
      .update({ status: "superseded" })
      .eq("user_id", userId)
      .in("status", ["active", "applied"])
      .neq("source_shot_id", shot.id);
    const stored = await supabase.from("recommendation_bundles")
      .upsert(row, { onConflict: "source_shot_id,engine_version" })
      .select(RECOMMENDATION_COLUMNS)
      .single();
    if (stored.error) throw stored.error;
    return stored.data as RecommendationBundleRecord;
  });
}

function outcomeScores(shot: Shot) {
  const result = calculateDialedScore({
    doseGrams: shot.dose_grams,
    finalYieldGrams: shot.final_yield_grams,
    extractionSeconds: shot.extraction_seconds,
    overallTasteRating: shot.overall_taste_rating,
    tasteBalance: shot.taste,
    extractionPicture: shot.flow,
    targetRecipe: parseRecipeSnapshot(shot.target_recipe_snapshot),
  });
  const normalized = (value: number | null) => value === null ? null : value / 100;
  return {
    taste: normalized(result.components.taste.score),
    recipe: normalized(result.components.recipe.score),
    picture: normalized(result.components.extractionPicture.score),
  };
}

export async function completeAppliedRecommendation(
  supabase: Client,
  userId: string,
  recommendationId: string,
  resultingShot: Shot,
  changeCount: number,
) {
  const recommendation = await supabase.from("recommendation_bundles")
    .select(RECOMMENDATION_COLUMNS)
    .eq("id", recommendationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!recommendation.data) return;
  const sourceResult = await supabase.from("shots")
    .select(SHOT_COLUMNS)
    .eq("id", recommendation.data.source_shot_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!sourceResult.data) return;
  const source = toShot(sourceResult.data as unknown as ShotRow);
  const before = outcomeScores(source);
  const after = outcomeScores(resultingShot);
  const outcome = calculateOutcome({
    previousSensoryScore: before.taste,
    newSensoryScore: after.taste,
    previousRecipeScore: before.recipe,
    newRecipeScore: after.recipe,
    previousFlowScore: before.picture,
    newFlowScore: after.picture,
    previousTotalScore: source.score,
    newTotalScore: resultingShot.score,
    manualAdditionalChangeCount: changeCount,
  });
  await supabase.from("recommendation_bundles")
    .update({ resulting_shot_id: resultingShot.id, status: "completed", outcome: outcome as unknown as Record<string, unknown> })
    .eq("id", recommendationId)
    .eq("user_id", userId);
}
