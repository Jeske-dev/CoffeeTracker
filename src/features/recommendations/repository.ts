import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Equipment, RecommendationBundleRecord, Shot, TargetRecipe, UserSettings } from "@/types/domain";
import { generateRecommendation } from "./engine";
import { calculateOutcome, personalEffectiveness } from "./outcome";
import { RECOMMENDATION_ENGINE_VERSION, type RecipeSnapshot, type RecommendationActionType, type RecommendationBundle, type RecommendationCandidate, type RecommendationShot } from "./types";

type Client = SupabaseClient<Database>;

function numberOrNull(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function stringOrNull(value: unknown) { return typeof value === "string" ? value : null; }
function stringArrayOrNull(value: unknown) { return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null; }

export function parseRecipeSnapshot(value: unknown): RecipeSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return {
    id: stringOrNull(row.id), doseGrams: numberOrNull(row.doseGrams), targetYieldGrams: numberOrNull(row.targetYieldGrams),
    targetExtractionTimeSeconds: numberOrNull(row.targetExtractionTimeSeconds), temperatureCelsius: numberOrNull(row.temperatureCelsius),
    grindSetting: stringOrNull(row.grindSetting), prepTools: stringArrayOrNull(row.prepTools),
  };
}

export function recommendationSetupKey(setup: { beanId: string | null; machineId: string | null; grinderId: string | null; basketId: string | null }) {
  return [setup.beanId, setup.machineId, setup.grinderId, setup.basketId].map((value) => value ?? "none").join(":");
}

export function recipeFromShot(shot: Shot): RecipeSnapshot {
  return {
    doseGrams: shot.dose_grams ?? null, targetYieldGrams: shot.final_yield_grams ?? null,
    targetExtractionTimeSeconds: shot.extraction_seconds ?? null, temperatureCelsius: shot.temperature_c ?? null,
    grindSetting: shot.grind_setting ?? null, prepTools: shot.prep_tools ?? null,
  };
}

export function toRecommendationShot(shot: Shot): RecommendationShot {
  const legacyBalance = shot.taste === "very_sour" ? -2 : shot.taste === "sour" ? -1 : shot.taste === "balanced" ? 0 : shot.taste === "bitter" ? 1 : shot.taste === "very_bitter" ? 2 : null;
  const legacyChanneling = shot.flow === "spritzing" || shot.flow === "channeling" ? 3 : shot.flow === "minor_channeling" ? 2 : shot.flow === "even" ? 0 : shot.channeling === true ? 3 : null;
  const flowRating = shot.flow_evenness_rating ?? (shot.flow_evenness == null ? null : Math.max(1, Math.min(5, Math.round(shot.flow_evenness / 25) + 1)));
  return {
    id: shot.id, beanId: shot.bean_id, machineId: shot.machine_id, grinderId: shot.grinder_id, basketId: shot.basket_id,
    targetRecipeSnapshot: parseRecipeSnapshot(shot.target_recipe_snapshot), doseGrams: shot.dose_grams, finalYieldGrams: shot.final_yield_grams,
    stopWeightGrams: shot.stop_weight_grams, extractionTimeSeconds: shot.extraction_seconds, firstDropTimeSeconds: shot.first_drop_seconds ?? null,
    temperatureCelsius: shot.temperature_c, grindSetting: shot.grind_setting, prepTools: shot.prep_tools,
    overallTasteRating: shot.overall_taste_rating, tasteBalance: shot.taste_balance ?? legacyBalance,
    astringencySeverity: shot.astringency_severity ?? null, channelingSeverity: shot.channeling_severity ?? legacyChanneling,
    sprayingSeverity: shot.spraying_severity ?? (shot.flow === "spritzing" ? 3 : null), flowEvenness: flowRating,
    puckDamageSeverity: shot.puck_damage_severity ?? null, showerScreenImprint: shot.shower_screen_imprint ?? null,
    puckScreenImprint: shot.puck_screen_imprint ?? null, puckWet: shot.puck === "wet" ? true : shot.puck ? false : null,
    puckStuck: shot.puck === "stuck" ? true : shot.puck ? false : null, strengthPerception: shot.strength_perception ?? null,
    tampLevel: shot.tamp_level ?? null, experimentMode: shot.experiment_mode ?? false,
    appliedRecommendationId: shot.applied_recommendation_id ?? null, score: shot.score,
  };
}

export function applyRepetitionPolicy(bundle: RecommendationBundle, previous: RecommendationBundleRecord[], setup: { beanId: string | null }) {
  const sameRecent = previous.filter((item) => item.bean_id === setup.beanId && (item.primary_action as { actionType?: string }).actionType === bundle.primary.actionType).slice(0, 2);
  if (sameRecent.length >= 2) {
    bundle.primary.title = `Gezieltes Experiment: ${bundle.primary.title}`;
    bundle.primary.explanation = `Das gleiche Muster trat mehrfach auf. Teste jetzt nur diese eine Änderung und vergleiche das Ergebnis. ${bundle.primary.explanation}`;
  }
  return { bundle, suppressActive: sameRecent[0]?.status === "dismissed" };
}

function bundleFromRecord(record: RecommendationBundleRecord): RecommendationBundle {
  return {
    engineVersion: RECOMMENDATION_ENGINE_VERSION, sourceShotId: record.source_shot_id,
    targetRecipeSnapshot: parseRecipeSnapshot(record.target_recipe_snapshot), primary: record.primary_action as unknown as RecommendationCandidate,
    executionAdjustment: record.execution_adjustments as RecommendationBundle["executionAdjustment"], generatedAt: record.created_at,
  };
}

export async function generateAndStoreRecommendation(supabase: Client, userId: string, shotId: string) {
  const [shotResult, historyResult, equipmentResult, settingsResult, recipesResult, previousResult, suppressionsResult] = await Promise.all([
    supabase.from("shots").select("*").eq("id", shotId).eq("user_id", userId).single(),
    supabase.from("shots").select("*").eq("user_id", userId).order("shot_at", { ascending: false }).limit(50),
    supabase.from("equipment").select("*").eq("user_id", userId),
    supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("target_recipes").select("*").eq("user_id", userId).eq("is_active", true),
    supabase.from("recommendation_bundles").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("recommendation_suppressions").select("setup_key").eq("user_id", userId),
  ]);
  if (shotResult.error || !shotResult.data) throw shotResult.error ?? new Error("Shot fehlt");
  const shot = shotResult.data as Shot;
  const history = (historyResult.data ?? []) as Shot[];
  const equipment = (equipmentResult.data ?? []) as Equipment[];
  const settings = settingsResult.data as UserSettings | null;
  const active = ((recipesResult.data ?? []) as TargetRecipe[]).find((recipe) => recipe.bean_id === shot.bean_id && recipe.machine_id === shot.machine_id && recipe.grinder_id === shot.grinder_id && recipe.basket_id === shot.basket_id);
  const referenceShot = settings?.reference_shot_id ? history.find((item) => item.id === settings.reference_shot_id) : null;
  const grinder = equipment.find((item) => item.id === shot.grinder_id);
  const machine = equipment.find((item) => item.id === shot.machine_id);
  const basket = equipment.find((item) => item.id === shot.basket_id);
  const prior = (previousResult.data ?? []) as RecommendationBundleRecord[];
  const effectiveness = Object.fromEntries([...new Set(prior.map((item) => (item.primary_action as { actionType?: RecommendationActionType }).actionType).filter(Boolean))].map((action) => {
    const evaluable = prior.filter((item) => (item.primary_action as { actionType?: string }).actionType === action && ["successful", "unsuccessful"].includes((item.outcome as { status?: string } | null)?.status ?? ""));
    const successful = evaluable.filter((item) => (item.outcome as { status?: string } | null)?.status === "successful").length;
    return [action as RecommendationActionType, personalEffectiveness(successful, evaluable.length)];
  })) as Partial<Record<RecommendationActionType, number>>;
  const sameSetupCompleted = prior.filter((item) => item.bean_id === shot.bean_id && item.machine_id === shot.machine_id && item.grinder_id === shot.grinder_id && item.basket_id === shot.basket_id && item.status === "completed");
  const bundle = generateRecommendation({
    shot: toRecommendationShot(shot), history: history.map(toRecommendationShot),
    activeRecipe: parseRecipeSnapshot(active?.recipe_snapshot), referenceRecipe: referenceShot ? recipeFromShot(referenceShot) : null,
    starterRecipe: parseRecipeSnapshot(settings?.starter_recipe),
    grinder: grinder ? { grindScaleType: grinder.grind_scale_type ?? null, minimumSetting: grinder.minimum_setting ?? null, maximumSetting: grinder.maximum_setting ?? null, microStep: grinder.micro_step ?? null, finerDirection: grinder.finer_direction ?? null, displayUnit: grinder.display_unit ?? null } : null,
    machine: machine ? { temperatureAdjustable: machine.temperature_adjustable ?? null, minimumTemperature: machine.minimum_temperature ?? null, maximumTemperature: machine.maximum_temperature ?? null } : null,
    basket: basket ? { nominalDoseGrams: basket.nominal_dose_grams ?? null, minimumDoseGrams: basket.minimum_dose_grams ?? null, maximumDoseGrams: basket.maximum_dose_grams ?? null } : null,
    yieldAdjustmentTested: sameSetupCompleted.some((item) => ["INCREASE_YIELD", "DECREASE_YIELD"].includes((item.primary_action as { actionType?: string }).actionType ?? "")),
    personalEffectiveness: effectiveness,
  });
  const policy = applyRepetitionPolicy(bundle, prior, { beanId: shot.bean_id });
  const setupKey = recommendationSetupKey({ beanId: shot.bean_id, machineId: shot.machine_id, grinderId: shot.grinder_id, basketId: shot.basket_id });
  const justDismissed = policy.suppressActive || (suppressionsResult.data ?? []).some((item) => item.setup_key === setupKey);
  const row = {
    user_id: userId, source_shot_id: shot.id, bean_id: shot.bean_id, machine_id: shot.machine_id, grinder_id: shot.grinder_id,
    basket_id: shot.basket_id, target_recipe_snapshot: bundle.targetRecipeSnapshot as unknown as Record<string, unknown> | null,
    engine_version: bundle.engineVersion, primary_action: bundle.primary as unknown as Record<string, unknown>,
    execution_adjustments: bundle.executionAdjustment as unknown as Record<string, unknown> | null, confidence: bundle.primary.confidence,
    confidence_label: bundle.primary.confidence < 0.45 ? "Niedrige Sicherheit" as const : bundle.primary.confidence < 0.75 ? "Mittlere Sicherheit" as const : "Hohe Sicherheit" as const,
    evidence: bundle.primary.evidence as unknown as Record<string, unknown>[], status: justDismissed ? "dismissed" as const : "active" as const,
    applied_at: null, dismissed_at: justDismissed ? new Date().toISOString() : null, resulting_shot_id: null, user_feedback: null, outcome: null,
  };
  const stored = await supabase.from("recommendation_bundles").upsert(row, { onConflict: "source_shot_id,engine_version" }).select("*").single();
  if (stored.error) throw stored.error;
  return stored.data as RecommendationBundleRecord;
}

export async function completeAppliedRecommendation(supabase: Client, userId: string, recommendationId: string, resultingShot: Shot, changeCount: number) {
  const recommendation = await supabase.from("recommendation_bundles").select("*").eq("id", recommendationId).eq("user_id", userId).maybeSingle();
  if (!recommendation.data) return;
  const source = await supabase.from("shots").select("*").eq("id", recommendation.data.source_shot_id).eq("user_id", userId).maybeSingle();
  if (!source.data) return;
  const subScores=(shot:Shot)=>{const sensory=shot.overall_taste_rating!==null?shot.overall_taste_rating/5:shot.taste_balance!=null?1-Math.abs(shot.taste_balance)/2:null;const target=parseRecipeSnapshot(shot.target_recipe_snapshot);const ratio=shot.dose_grams&&shot.final_yield_grams?shot.final_yield_grams/shot.dose_grams:null;const targetRatio=target?.doseGrams&&target.targetYieldGrams?target.targetYieldGrams/target.doseGrams:null;const timePart=target?.targetExtractionTimeSeconds&&shot.extraction_seconds!==null?Math.max(0,1-Math.abs(shot.extraction_seconds-target.targetExtractionTimeSeconds)/Math.max(3,target.targetExtractionTimeSeconds*.12)):null;const ratioPart=targetRatio!==null&&ratio!==null?Math.max(0,1-Math.abs(ratio-targetRatio)/.15):null;const recipeParts=[timePart,ratioPart].filter((value):value is number=>value!==null);const recipe=recipeParts.length?recipeParts.reduce((sum,value)=>sum+value,0)/recipeParts.length:null;const legacyFlow=shot.flow==="even"?0:shot.flow==="minor_channeling"?2:shot.flow==="channeling"||shot.flow==="spritzing"?3:null;const flowParts=[shot.channeling_severity,shot.spraying_severity,shot.flow_evenness_rating==null?null:5-shot.flow_evenness_rating,legacyFlow].filter((value):value is number=>value!=null);const flow=flowParts.length?1-Math.max(...flowParts)/4:null;return{sensory,recipe,flow}};const before=subScores(source.data);const after=subScores(resultingShot);
  const outcome = calculateOutcome({ previousSensoryScore: before.sensory, newSensoryScore: after.sensory, previousRecipeScore: before.recipe, newRecipeScore: after.recipe, previousFlowScore: before.flow, newFlowScore: after.flow, previousTotalScore: source.data.score, newTotalScore: resultingShot.score, manualAdditionalChangeCount: changeCount });
  await supabase.from("recommendation_bundles").update({ resulting_shot_id: resultingShot.id, status: "completed", outcome: outcome as unknown as Record<string, unknown> }).eq("id", recommendationId).eq("user_id", userId);
}

export { bundleFromRecord };
