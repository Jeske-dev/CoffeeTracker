import { calculateDialedScore, scoreTargetFromSnapshot, SCORING_VERSION } from "@/lib/calculations";
import { normalizePrepTools } from "@/lib/prep-tools";
import type { ShotEditInput, ShotInput } from "@/lib/validation";
import type { Bean, Equipment, RecommendationBundleRecord, Shot, ShotSummary, UserSettings } from "@/types/domain";

const trackedRecipeFields = ["doseGrams", "grindSetting", "stopWeightGrams"] as const;
const clearedRecommendationMetadata = {
  targetRecipeSnapshot: null,
  recommendationBundleId: null,
  recommendationApplied: false,
  recommendationChanges: [],
  experimentMode: false,
} satisfies Partial<ShotInput>;

export type ShotEquipmentGroups = {
  machines: Equipment[];
  grinders: Equipment[];
  baskets: Equipment[];
};

export function getSelectableBeans(beans: readonly Bean[], selectedBeanId: string | null = null) {
  return beans.filter((bean) => !bean.archived_at || bean.id === selectedBeanId);
}

export function groupShotEquipment(
  equipment: readonly Equipment[],
  selected: Pick<Shot, "machine_id" | "grinder_id" | "basket_id"> | null = null,
): ShotEquipmentGroups {
  const selectedIds = new Set([selected?.machine_id, selected?.grinder_id, selected?.basket_id].filter(Boolean));
  return equipment.reduce<ShotEquipmentGroups>((groups, item) => {
    if (item.archived_at && !selectedIds.has(item.id)) return groups;
    if (item.type === "machine") groups.machines.push(item);
    if (item.type === "grinder") groups.grinders.push(item);
    if (item.type === "basket") groups.baskets.push(item);
    return groups;
  }, { machines: [], grinders: [], baskets: [] });
}

export function createShotDefaults({
  beans,
  settings,
  lastShot,
}: {
  beans: readonly Bean[];
  settings: UserSettings | null;
  lastShot: Shot | null;
}): ShotInput {
  const activeBeans = getSelectableBeans(beans);
  const defaultBean = activeBeans.find((bean) => bean.id === settings?.last_bean_id)
    ?? activeBeans.find((bean) => bean.id === lastShot?.bean_id)
    ?? activeBeans[0];

  return {
    beanId: defaultBean?.id ?? "",
    machineId: settings?.default_machine_id ?? lastShot?.machine_id ?? null,
    grinderId: settings?.default_grinder_id ?? lastShot?.grinder_id ?? null,
    basketId: lastShot?.basket_id ?? null,
    grindSetting: lastShot?.grind_setting ?? null,
    doseGrams: lastShot?.dose_grams ?? 18,
    prepTools: normalizePrepTools(settings ? settings.default_prep_tools : lastShot?.prep_tools),
    extractionSeconds: null,
    stopWeightGrams: lastShot?.stop_weight_grams ?? null,
    finalYieldGrams: lastShot?.final_yield_grams ?? 36,
    taste: null,
    flow: null,
    puck: null,
    notes: null,
    overallTasteRating: null,
    ...clearedRecommendationMetadata,
  };
}

export function createShotEditDefaults(shot: Shot): ShotEditInput {
  return {
    shotAt: toLocalDateTime(shot.shot_at),
    beanId: shot.bean_id,
    machineId: shot.machine_id,
    grinderId: shot.grinder_id,
    basketId: shot.basket_id,
    grindSetting: shot.grind_setting,
    doseGrams: shot.dose_grams ?? 18,
    prepTools: normalizePrepTools(shot.prep_tools),
    extractionSeconds: shot.extraction_seconds,
    stopWeightGrams: shot.stop_weight_grams,
    finalYieldGrams: shot.final_yield_grams ?? 36,
    taste: shot.taste,
    flow: shot.flow,
    puck: shot.puck,
    notes: shot.notes,
    overallTasteRating: shot.overall_taste_rating,
    ...clearedRecommendationMetadata,
    targetRecipeSnapshot: shot.target_recipe_snapshot,
  };
}

export function restoreShotDraft(defaults: ShotInput, draft: ShotInput): ShotInput {
  return {
    ...defaults,
    ...draft,
    machineId: defaults.machineId,
    grinderId: defaults.grinderId,
    basketId: defaults.basketId,
    prepTools: normalizePrepTools(draft.prepTools),
    ...clearedRecommendationMetadata,
  };
}

export function prepareShotSubmission(data: ShotInput, defaults: ShotInput): ShotInput {
  const recommendationChanges = trackedRecipeFields
    .filter((field) => !Object.is(data[field], defaults[field]))
    .map((field) => ({
      field,
      previousValue: defaults[field],
      recommendedValue: data[field],
      actualValue: data[field],
      manual: true,
    }));
  return { ...data, ...clearedRecommendationMetadata, recommendationChanges };
}

export function recommendationMatchesSetup(recommendation: RecommendationBundleRecord | null, values: ShotInput) {
  return Boolean(recommendation)
    && recommendation?.bean_id === values.beanId
    && recommendation?.machine_id === values.machineId
    && recommendation?.grinder_id === values.grinderId
    && recommendation?.basket_id === values.basketId;
}

export function stepGrindSetting(value: string | null, delta: number) {
  const parsed = Number(value?.replace(",", "."));
  const current = Number.isFinite(parsed) ? parsed : 0;
  return (current + delta).toFixed(1);
}

export function stepNumericValue(value: number | null | undefined, delta: number, minimum = 0) {
  const current = typeof value === "number" && Number.isFinite(value) ? value : minimum;
  return Math.max(minimum, Math.round((current + delta) * 10) / 10);
}

export function calculateShotInputScore(values: ShotInput) {
  return calculateDialedScore({
    doseGrams: values.doseGrams,
    finalYieldGrams: values.finalYieldGrams,
    extractionSeconds: values.extractionSeconds,
    overallTasteRating: values.overallTasteRating,
    tasteBalance: values.taste,
    extractionPicture: values.flow,
    targetRecipe: scoreTargetFromSnapshot(values.targetRecipeSnapshot),
  });
}

export function buildOptimisticShot({
  id,
  shotAt,
  input,
  bean,
  score,
  coverage,
}: {
  id: string;
  shotAt: string;
  input: ShotInput;
  bean: Bean | null;
  score: number | null;
  coverage: number;
}): ShotSummary {
  return {
    id,
    bean_id: input.beanId,
    machine_id: input.machineId,
    grinder_id: input.grinderId,
    basket_id: input.basketId,
    shot_at: shotAt,
    grind_setting: input.grindSetting,
    dose_grams: input.doseGrams,
    extraction_seconds: input.extractionSeconds,
    stop_weight_grams: input.stopWeightGrams,
    final_yield_grams: input.finalYieldGrams,
    taste: input.taste,
    flow: input.flow,
    score,
    score_coverage: coverage,
    target_recipe_snapshot: null,
    scoring_version: SCORING_VERSION,
    beans: bean ? { id: bean.id, name: bean.name, roaster: bean.roaster, roast_date: bean.roast_date, origin: bean.origin } : null,
  };
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
