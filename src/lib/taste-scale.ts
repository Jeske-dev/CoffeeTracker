import type { ShotTaste } from "@/types/domain";

export type TasteLevel = "too_sour" | "slightly_sour" | "balanced" | "slightly_bitter" | "too_bitter";

export const tasteLevelValues: Record<TasteLevel, { taste: ShotTaste; rating: number; label: string }> = {
  too_sour: { taste: "sour", rating: 2, label: "Zu sauer" },
  slightly_sour: { taste: "sour", rating: 4, label: "Leicht sauer" },
  balanced: { taste: "balanced", rating: 5, label: "Ausgewogen" },
  slightly_bitter: { taste: "bitter", rating: 4, label: "Leicht bitter" },
  too_bitter: { taste: "bitter", rating: 2, label: "Zu bitter" },
};

export function tasteLevelFromShot(taste: ShotTaste | null, rating: number | null): TasteLevel | null {
  if (taste === "balanced") return "balanced";
  if (taste === "sour") return rating !== null && rating >= 3 ? "slightly_sour" : "too_sour";
  if (taste === "bitter") return rating !== null && rating >= 3 ? "slightly_bitter" : "too_bitter";
  return null;
}
