import { grindChange } from "./grind-sensitivity";
import { clamp, roundTo } from "./signals";
import { formatGerman, impactText } from "./templates.de";
import type {
  RecipeSnapshot,
  RecommendationCandidate,
  RecommendationInput,
  RecommendationSignals,
  RecommendationShot,
} from "./types";

type RuleContext = RecommendationInput & {
  target: RecipeSnapshot | null;
  comparable: RecommendationShot[];
  signals: RecommendationSignals;
};

function evidence(label: string, value: string, primary = false) {
  return { label, value, importance: primary ? "primary" as const : "supporting" as const };
}

function candidate(
  context: RuleContext,
  values: Omit<RecommendationCandidate, "expectedImpact" | "personalEffectiveness" | "summary" | "suppressedReasons">,
): RecommendationCandidate {
  return {
    ...values,
    summary: impactText[values.actionType],
    expectedImpact: 0.7,
    personalEffectiveness: context.personalEffectiveness?.[values.actionType] ?? 0.5,
    suppressedReasons: [],
  };
}

function yieldDelta(targetYield: number) {
  return clamp(roundTo(targetYield * 0.05, 0.5), 1, 3);
}

function usesWdt(shot: RecommendationShot) {
  return shot.prepTools?.some((tool) => tool.toLowerCase() === "wdt") ?? false;
}

function repeatedTasteAndTime(context: RuleContext, direction: "finer" | "coarser") {
  const targetTime = context.target?.targetExtractionTimeSeconds;
  if (targetTime === null || targetTime === undefined) return false;
  const threshold = Math.max(3, targetTime * 0.12);
  return context.comparable.slice(0, 3).filter((shot) => {
    const tasteMatches = direction === "finer" ? shot.taste === "sour" : shot.taste === "bitter";
    if (!tasteMatches || shot.extractionTimeSeconds === null) return false;
    const deviation = shot.extractionTimeSeconds - targetTime;
    return direction === "finer" ? deviation < -threshold : deviation > threshold;
  }).length >= 2;
}

export function generateCandidates(context: RuleContext): RecommendationCandidate[] {
  const { shot, signals, target, comparable } = context;
  const candidates: RecommendationCandidate[] = [];

  if (signals.goodShot) {
    candidates.push(candidate(context, {
      actionType: "KEEP_RECIPE",
      priorityTier: 1,
      severity: 1,
      confidence: 0.9,
      title: "Beibehalten – dieser Shot hat gut funktioniert.",
      explanation: "Bewertung und Balance passen zusammen, ohne starkes Channeling.",
      changes: [],
      evidence: [evidence("Bewertung", `${shot.overallTasteRating}/5`, true), evidence("Geschmack", "ausgewogen")],
    }));
  }

  const repeatedMinorChanneling = comparable.slice(0, 3).filter((item) => item.extractionPicture === "minor_channeling").length >= 2;
  const channelingProblem = signals.severeChanneling || repeatedMinorChanneling;
  if (channelingProblem) {
    const wdtUsed = usesWdt(shot);
    const actionType = wdtUsed ? "IMPROVE_WDT" as const : "USE_WDT" as const;
    const nextTools = wdtUsed ? shot.prepTools : [...(shot.prepTools ?? []), "WDT"];
    candidates.push(candidate(context, {
      actionType,
      priorityTier: 2,
      severity: signals.severeChanneling ? 1 : 0.7,
      confidence: signals.severeChanneling ? 0.86 : 0.65,
      title: wdtUsed ? "WDT gleichmäßiger ausführen" : "WDT verwenden",
      explanation: wdtUsed
        ? "Verteile das Kaffeemehl mit WDT etwas gleichmäßiger und lasse das restliche Rezept unverändert."
        : "Teste beim nächsten Shot WDT und lasse Mahlgrad, Dosis und Zielgewicht unverändert.",
      changes: [{ field: "prepTools", previousValue: shot.prepTools, recommendedValue: nextTools }],
      evidence: [evidence("Extraktionsbild", signals.severeChanneling ? "starkes Channeling" : "wiederholt leichtes Channeling", true)],
    }));
  }

  const addGrind = (direction: "finer" | "coarser", priorityTier: number, technicalOnly = false) => {
    if (target?.targetExtractionTimeSeconds === null || target?.targetExtractionTimeSeconds === undefined) return;
    const repeated = repeatedTasteAndTime(context, direction);
    const strongDeviation = Math.abs(signals.timeDeviation ?? 0) > (signals.timeThreshold ?? 3) * 2;
    const change = grindChange({
      direction,
      shot,
      targetTime: target.targetExtractionTimeSeconds,
      comparable,
      grinder: context.grinder,
      strong: strongDeviation || repeated,
    });
    const directionText = direction === "finer" ? "feiner" : "gröber";
    const actionType = direction === "finer" ? "GRIND_FINER" as const : "GRIND_COARSER" as const;
    const title = change.recommended === null
      ? `${change.steps} ${change.unit}${change.steps === 1 ? "" : "e"} ${directionText} mahlen`
      : `Mahlgrad auf ${change.recommended} stellen`;
    candidates.push(candidate(context, {
      actionType,
      priorityTier,
      severity: strongDeviation ? 1 : 0.75,
      confidence: technicalOnly ? 0.35 : repeated ? 0.88 : 0.76,
      title,
      explanation: technicalOnly
        ? `Teste einen kleinen Schritt ${directionText}. Da keine Geschmacksbewertung vorhanden ist, basiert der Tipp nur auf der Abweichung von deinem Zielrezept.`
        : direction === "finer"
          ? "Der Shot lief schneller als dein Ziel und schmeckte sauer."
          : "Der Shot lief langsamer als dein Ziel und schmeckte bitter.",
      changes: [{
        field: "grindSetting",
        previousValue: shot.grindSetting,
        recommendedValue: change.recommended ?? shot.grindSetting,
        unit: change.unit,
      }],
      evidence: [evidence("Zeitabweichung", `${formatGerman(signals.timeDeviation ?? 0)} s`, true)],
    }));
  };

  if (!channelingProblem && shot.taste === "sour" && signals.fastShot) addGrind("finer", 3);
  if (!channelingProblem && shot.taste === "bitter" && signals.slowShot) addGrind("coarser", 4);

  if (!channelingProblem && target?.targetYieldGrams != null && signals.timeNearTarget && shot.taste === "sour") {
    const next = target.targetYieldGrams + yieldDelta(target.targetYieldGrams);
    candidates.push(candidate(context, {
      actionType: "INCREASE_YIELD",
      priorityTier: 5,
      severity: 0.75,
      confidence: 0.76,
      title: `Zielgewicht auf ${formatGerman(next)} g erhöhen`,
      explanation: `Die Zeit lag nahe am Ziel, der Shot schmeckte aber sauer. Erhöhe das Zielgewicht von ${formatGerman(target.targetYieldGrams)} g auf ${formatGerman(next)} g.`,
      changes: [{ field: "targetYieldGrams", previousValue: target.targetYieldGrams, recommendedValue: next, unit: "g" }],
      evidence: [evidence("Extraktionszeit", "nahe am Ziel", true), evidence("Geschmack", "zu sauer")],
    }));
  }

  if (!channelingProblem && target?.targetYieldGrams != null && signals.timeNearTarget && shot.taste === "bitter") {
    const next = Math.max(0.5, target.targetYieldGrams - yieldDelta(target.targetYieldGrams));
    candidates.push(candidate(context, {
      actionType: "DECREASE_YIELD",
      priorityTier: 6,
      severity: 0.75,
      confidence: 0.76,
      title: `Zielgewicht auf ${formatGerman(next)} g reduzieren`,
      explanation: `Die Zeit lag nahe am Ziel, der Shot schmeckte aber bitter. Reduziere das Zielgewicht von ${formatGerman(target.targetYieldGrams)} g auf ${formatGerman(next)} g.`,
      changes: [{ field: "targetYieldGrams", previousValue: target.targetYieldGrams, recommendedValue: next, unit: "g" }],
      evidence: [evidence("Extraktionszeit", "nahe am Ziel", true), evidence("Geschmack", "zu bitter")],
    }));
  }

  if (!channelingProblem && shot.doseGrams !== null && context.basket?.maximumDoseGrams != null && shot.doseGrams > context.basket.maximumDoseGrams) {
    const next = Math.max(0.5, roundTo(shot.doseGrams - 0.5, 0.5));
    candidates.push(candidate(context, {
      actionType: "DECREASE_DOSE",
      priorityTier: 7,
      severity: 0.8,
      confidence: 0.88,
      title: `Dosis auf ${formatGerman(next)} g reduzieren`,
      explanation: `Die Dosis liegt über der hinterlegten Kapazität deines Siebs. Reduziere nur die Dosis um 0,5 g.`,
      changes: [{ field: "doseGrams", previousValue: shot.doseGrams, recommendedValue: next, unit: "g" }],
      evidence: [evidence("Siebkapazität", `maximal ${formatGerman(context.basket.maximumDoseGrams)} g`, true)],
    }));
  }

  if (!channelingProblem && shot.doseGrams !== null && context.basket?.minimumDoseGrams != null && shot.doseGrams < context.basket.minimumDoseGrams) {
    const next = roundTo(shot.doseGrams + 0.5, 0.5);
    candidates.push(candidate(context, {
      actionType: "INCREASE_DOSE",
      priorityTier: 7,
      severity: 0.8,
      confidence: 0.88,
      title: `Dosis auf ${formatGerman(next)} g erhöhen`,
      explanation: `Die Dosis liegt unter der hinterlegten sinnvollen Kapazität deines Siebs. Erhöhe nur die Dosis um 0,5 g.`,
      changes: [{ field: "doseGrams", previousValue: shot.doseGrams, recommendedValue: next, unit: "g" }],
      evidence: [evidence("Siebkapazität", `mindestens ${formatGerman(context.basket.minimumDoseGrams)} g`, true)],
    }));
  }

  if (!channelingProblem && !signals.hasTasteData) {
    if (signals.fastShot) addGrind("finer", 8, true);
    if (signals.slowShot) addGrind("coarser", 8, true);
  }

  candidates.push(candidate(context, {
    actionType: "COLLECT_MORE_DATA",
    priorityTier: 9,
    severity: 0.3,
    confidence: 0.3,
    title: "Mehr Daten sammeln",
    explanation: "Bewerte beim nächsten Shot kurz Geschmack und Extraktionsbild. Danach kann Dialed einen konkreteren Tipp geben.",
    changes: [],
    evidence: [evidence("Datenbasis", target ? "keine eindeutige einzelne Änderung" : "kein Zielrezept", true)],
  }));

  return candidates;
}

export function candidateScore(value: RecommendationCandidate) {
  return value.confidence + value.severity;
}
