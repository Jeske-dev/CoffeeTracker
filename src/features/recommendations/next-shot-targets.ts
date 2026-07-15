import { estimateStopWeight } from "@/features/shots/stop-weight-estimate";
import type { ShotSummary } from "@/types/domain";
import { recommendedGrindSetting } from "./grind-sensitivity";

type StopHistoryShot = Pick<ShotSummary,
  "id" | "bean_id" | "shot_at" | "grind_setting" | "stop_weight_grams" | "final_yield_grams"
>;
type TargetSourceShot = StopHistoryShot & Pick<ShotSummary, "dose_grams" | "extraction_seconds">;

export type NextShotTargets = {
  doseGrams: number | null;
  grindSetting: string | null;
  stopWeightGrams: number | null;
  changed: {
    dose: boolean;
    grind: boolean;
    stop: boolean;
  };
};

export function resolveNextShotTargets(
  latestShot: TargetSourceShot | null | undefined,
  history: readonly StopHistoryShot[] = [],
): NextShotTargets {
  if (!latestShot) return emptyTargets;

  const grindSetting = recommendedGrindSetting(latestShot.grind_setting, latestShot.extraction_seconds);
  const measurements = uniqueShots([latestShot, ...history]).map((shot) => ({
    id: shot.id,
    beanId: shot.bean_id,
    grindSetting: shot.grind_setting,
    stopWeightGrams: shot.stop_weight_grams,
    finalWeightGrams: shot.final_yield_grams,
    occurredAt: shot.shot_at,
  }));
  const stopEstimate = estimateStopWeight({
    beanId: latestShot.bean_id,
    grindSetting,
    targetFinalWeightGrams: latestShot.final_yield_grams,
    history: measurements,
  });
  const stopWeightGrams = stopEstimate?.recommendedStopWeightGrams ?? latestShot.stop_weight_grams;

  return {
    doseGrams: latestShot.dose_grams,
    grindSetting,
    stopWeightGrams,
    changed: {
      dose: false,
      grind: grindSetting !== null && grindSetting !== latestShot.grind_setting,
      stop: stopWeightGrams !== null && stopWeightGrams !== latestShot.stop_weight_grams,
    },
  };
}

const emptyTargets: NextShotTargets = {
  doseGrams: null,
  grindSetting: null,
  stopWeightGrams: null,
  changed: { dose: false, grind: false, stop: false },
};

function uniqueShots(shots: readonly StopHistoryShot[]) {
  const ids = new Set<string>();
  return shots.filter((shot) => {
    if (ids.has(shot.id)) return false;
    ids.add(shot.id);
    return true;
  });
}
