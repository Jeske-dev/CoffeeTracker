import type { RecipeSnapshot } from "./types";

export function parseRecipeSnapshot(value: unknown): RecipeSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const recipe: RecipeSnapshot = {
    id: stringOrNull(row.id),
    doseGrams: numberOrNull(row.doseGrams),
    targetYieldGrams: numberOrNull(row.targetYieldGrams),
    targetExtractionTimeSeconds: numberOrNull(row.targetExtractionTimeSeconds),
    grindSetting: stringOrNull(row.grindSetting),
    prepTools: stringArrayOrNull(row.prepTools),
  };
  return Object.values(recipe).some((item) => item !== null) ? recipe : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function stringArrayOrNull(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
}
