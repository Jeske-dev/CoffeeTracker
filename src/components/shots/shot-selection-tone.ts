import type { ShotSelectionTone } from "@/lib/shot-options";

export const shotSelectionToneClasses: Record<ShotSelectionTone, string> = {
  optimal: "border-black bg-black text-white",
  near: "border-black bg-[#757575] text-white",
  far: "border-[var(--crema-error)] bg-[var(--crema-error-soft)] text-[var(--crema-error)]",
};
