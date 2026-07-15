import { grindDirectionForTime, RECOMMENDED_GRIND_STEP } from "./policy";
import type { GrinderConfig, RecommendationShot } from "./types";

type GrindDirection = "finer" | "coarser";

export function grindChange({
  direction,
  shot,
  grinder,
}: {
  direction: GrindDirection;
  shot: Pick<RecommendationShot, "grindSetting">;
  grinder?: GrinderConfig | null;
}) {
  const current = numericGrindSetting(shot.grindSetting);
  if (current === null) {
    return {
      previous: shot.grindSetting,
      recommended: null,
      unit: grinder?.displayUnit ?? "Mahlgrad",
    };
  }

  const delta = direction === "finer" ? RECOMMENDED_GRIND_STEP : -RECOMMENDED_GRIND_STEP;
  const minimum = grinder?.minimumSetting ?? Number.NEGATIVE_INFINITY;
  const maximum = grinder?.maximumSetting ?? Number.POSITIVE_INFINITY;
  const next = Math.min(maximum, Math.max(minimum, current + delta));

  return {
    previous: shot.grindSetting,
    recommended: formatGrindSetting(next),
    unit: grinder?.displayUnit ?? "Mahlgrad",
  };
}

export function recommendedGrindSetting(
  grindSetting: string | null,
  extractionTimeSeconds: number | null,
  grinder?: GrinderConfig | null,
) {
  const direction = grindDirectionForTime(extractionTimeSeconds);
  if (!direction) return grindSetting;
  return grindChange({
    direction,
    shot: { grindSetting },
    grinder,
  }).recommended ?? grindSetting;
}

function numericGrindSetting(value: string | null) {
  const parsed = Number(value?.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatGrindSetting(value: number) {
  return Number(value.toFixed(2)).toString();
}
