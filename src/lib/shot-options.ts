import type { PuckState, ShotFlow } from "@/types/domain";

export type ShotSelectionTone = "optimal" | "near" | "far";

export const SHOT_FLOW_OPTIONS = [
  { value: "even", label: "Gleichmäßig", tone: "optimal" },
  { value: "minor_channeling", label: "Leichtes Channeling", tone: "near" },
  { value: "channeling", label: "Starkes Channeling", tone: "far" },
] as const satisfies ReadonlyArray<{ value: ShotFlow; label: string; tone: ShotSelectionTone }>;

export const PUCK_STATE_OPTIONS = [
  { value: "ideal", label: "Normal", tone: "optimal" },
  { value: "wet", label: "Nass", tone: "near" },
  { value: "dry", label: "Trocken", tone: "near" },
  { value: "stuck", label: "Festhängend", tone: "far" },
] as const satisfies ReadonlyArray<{ value: PuckState; label: string; tone: ShotSelectionTone }>;

const shotFlowLabels = Object.fromEntries(SHOT_FLOW_OPTIONS.map(({ value, label }) => [value, label])) as Record<ShotFlow, string>;
const puckStateLabels = Object.fromEntries(PUCK_STATE_OPTIONS.map(({ value, label }) => [value, label])) as Record<PuckState, string>;
const shotFlowTones = Object.fromEntries(SHOT_FLOW_OPTIONS.map(({ value, tone }) => [value, tone])) as Record<ShotFlow, ShotSelectionTone>;
const puckStateTones = Object.fromEntries(PUCK_STATE_OPTIONS.map(({ value, tone }) => [value, tone])) as Record<PuckState, ShotSelectionTone>;

export function shotFlowLabel(value: ShotFlow | null, fallback = "Nicht angegeben") {
  return value ? shotFlowLabels[value] : fallback;
}

export function puckStateLabel(value: PuckState | null, fallback = "Nicht angegeben") {
  return value ? puckStateLabels[value] : fallback;
}

export function shotFlowTone(value: ShotFlow | null) {
  return value ? shotFlowTones[value] : null;
}

export function puckStateTone(value: PuckState | null) {
  return value ? puckStateTones[value] : null;
}
