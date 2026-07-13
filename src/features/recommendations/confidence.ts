import { clamp } from "./signals";
import type { ConfidenceLabel } from "./types";

export function calculateConfidence(input: { relevantDataCoverage: number; comparableShotCount: number; patternAgreement: number; measurementReliability: number }) {
  return clamp(0.35 * input.relevantDataCoverage + 0.25 * Math.min(input.comparableShotCount / 5, 1) + 0.25 * input.patternAgreement + 0.15 * input.measurementReliability);
}

export function confidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence < 0.45) return "Niedrige Sicherheit";
  if (confidence < 0.75) return "Mittlere Sicherheit";
  return "Hohe Sicherheit";
}
