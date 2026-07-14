import { CheckCircle2, Circle, Droplets, Sun, TriangleAlert, Waves, type LucideIcon } from "lucide-react";
import type { PuckState, ShotFlow } from "@/types/domain";

export const shotFlowIcons = {
  even: Circle,
  minor_channeling: Waves,
  channeling: TriangleAlert,
} as const satisfies Record<ShotFlow, LucideIcon>;

export const puckStateIcons = {
  ideal: CheckCircle2,
  wet: Droplets,
  dry: Sun,
  stuck: TriangleAlert,
} as const satisfies Record<PuckState, LucideIcon>;
