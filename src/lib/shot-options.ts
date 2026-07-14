import type { PuckState, ShotFlow } from "@/types/domain";

export const SHOT_FLOW_OPTIONS = [
  { value: "even", label: "Gleichmäßig" },
  { value: "minor_channeling", label: "Leichtes Channeling" },
  { value: "channeling", label: "Starkes Channeling" },
] as const satisfies ReadonlyArray<{ value: ShotFlow; label: string }>;

export const PUCK_STATE_OPTIONS = [
  { value: "ideal", label: "Normal" },
  { value: "wet", label: "Nass" },
  { value: "dry", label: "Trocken" },
  { value: "stuck", label: "Festhängend" },
] as const satisfies ReadonlyArray<{ value: PuckState; label: string }>;

const shotFlowLabels = Object.fromEntries(SHOT_FLOW_OPTIONS.map(({ value, label }) => [value, label])) as Record<ShotFlow, string>;
const puckStateLabels = Object.fromEntries(PUCK_STATE_OPTIONS.map(({ value, label }) => [value, label])) as Record<PuckState, string>;

export function shotFlowLabel(value: ShotFlow | null, fallback = "Nicht angegeben") {
  return value ? shotFlowLabels[value] : fallback;
}

export function puckStateLabel(value: PuckState | null, fallback = "Nicht angegeben") {
  return value ? puckStateLabels[value] : fallback;
}
