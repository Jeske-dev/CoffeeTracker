import type { RecommendationActionType } from "./types";

export const impactText: Record<RecommendationActionType, string> = {
  KEEP_RECIPE: "Du hast einen starken Referenzpunkt für weitere Shots.",
  GRIND_FINER: "Das sollte den Flow etwas verlangsamen.",
  GRIND_COARSER: "Das sollte den Flow etwas beschleunigen.",
  INCREASE_YIELD: "Das längere Verhältnis kann die Extraktion und Balance erhöhen.",
  DECREASE_YIELD: "Das kürzere Verhältnis kann Bitterkeit reduzieren oder mehr Körper geben.",
  ADJUST_STOP_WEIGHT: "So landet der Nachlauf näher am Zielgewicht.",
  USE_WDT: "Eine gleichmäßigere Verteilung kann Channeling reduzieren.",
  IMPROVE_DISTRIBUTION: "Ein reproduzierbarer Puck macht den nächsten Vergleich belastbarer.",
  LEVEL_TAMP: "Ein gerader Tamp kann den Flow gleichmäßiger machen.",
  DECREASE_DOSE: "Mehr Headspace verhindert Kontakt mit dem Duschsieb.",
  INCREASE_DOSE: "Die höhere Dosis kann den Flow an der Mahlgrenze verlangsamen.",
  INCREASE_TEMPERATURE: "Die kleine Änderung kann die Extraktion etwas erhöhen.",
  DECREASE_TEMPERATURE: "Die kleine Änderung kann röstige Bitterkeit reduzieren.",
  COLLECT_MORE_DATA: "Mit den fehlenden Messwerten wird der nächste Tipp konkreter.",
};

export function formatGerman(value: number, decimals = 1) {
  return value.toFixed(decimals).replace(".", ",");
}
