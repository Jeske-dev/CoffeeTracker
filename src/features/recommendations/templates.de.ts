import type { RecommendationActionType } from "./types";

export const impactText: Record<RecommendationActionType, string> = {
  KEEP_RECIPE: "Du hast einen starken Referenzpunkt für weitere Shots.",
  GRIND_FINER: "Das sollte den Flow etwas verlangsamen.",
  GRIND_COARSER: "Das sollte den Flow etwas beschleunigen.",
  INCREASE_YIELD: "Das längere Verhältnis kann die Extraktion und Balance erhöhen.",
  DECREASE_YIELD: "Das kürzere Verhältnis kann Bitterkeit reduzieren.",
  ADJUST_STOP_WEIGHT: "So landet der Nachlauf näher am Zielgewicht.",
  USE_WDT: "Eine gleichmäßigere Verteilung kann Channeling reduzieren.",
  IMPROVE_WDT: "Eine gleichmäßigere WDT-Verteilung kann Channeling reduzieren.",
  DECREASE_DOSE: "Mehr Headspace verhindert Kontakt mit dem Duschsieb.",
  INCREASE_DOSE: "Die Dosis liegt damit wieder im sinnvollen Bereich des Siebs.",
  COLLECT_MORE_DATA: "Mit den fehlenden Messwerten wird der nächste Tipp konkreter.",
};

export function formatGerman(value: number, decimals = 1) {
  return value.toFixed(decimals).replace(".", ",");
}
