export const TARGET_EXTRACTION_MIN_SECONDS = 20;
export const TARGET_EXTRACTION_MAX_SECONDS = 30;
export const RECOMMENDED_GRIND_STEP = 0.33;

export function grindDirectionForTime(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return null;
  if (seconds < TARGET_EXTRACTION_MIN_SECONDS) return "finer" as const;
  if (seconds > TARGET_EXTRACTION_MAX_SECONDS) return "coarser" as const;
  return null;
}
