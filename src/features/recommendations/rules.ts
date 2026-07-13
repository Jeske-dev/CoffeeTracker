import { calculateConfidence } from "./confidence";
import { grindChange, normalizedFineness } from "./grind-sensitivity";
import { clamp, roundTo } from "./signals";
import { formatGerman, impactText } from "./templates.de";
import type { RecipeSnapshot, RecommendationCandidate, RecommendationInput, RecommendationSignals, RecommendationShot } from "./types";

type RuleContext = RecommendationInput & { target: RecipeSnapshot | null; comparable: RecommendationShot[]; signals: RecommendationSignals };

function evidence(label: string, value: string, primary = false) {
  return { label, value, importance: primary ? "primary" as const : "supporting" as const };
}

function confidence(context: RuleContext, coverage: number, agreement: number, reliability = 1) {
  return calculateConfidence({ relevantDataCoverage: coverage, comparableShotCount: context.comparable.length, patternAgreement: agreement, measurementReliability: reliability });
}

function candidate(context: RuleContext, values: Omit<RecommendationCandidate, "confidence" | "expectedImpact" | "personalEffectiveness" | "summary" | "suppressedReasons"> & { confidence: number; expectedImpact?: number }) : RecommendationCandidate {
  return { ...values, summary: impactText[values.actionType], expectedImpact: values.expectedImpact ?? 0.7, personalEffectiveness: context.personalEffectiveness?.[values.actionType] ?? 0.5, suppressedReasons: [] };
}

function tasteAgreement(context: RuleContext, kind: "sour" | "bitter") {
  if (!context.comparable.length) return context.signals.severeFlowProblem ? 1 : 0.5;
  const count = context.comparable.filter((shot) => kind === "sour" ? (shot.tasteBalance ?? 0) <= -1 : (shot.tasteBalance ?? 0) >= 1 || (shot.astringencySeverity ?? 0) >= 2).length;
  return count / context.comparable.length;
}

function yieldDelta(target: number, strong: boolean) {
  return clamp(roundTo(target * (strong ? 0.08 : 0.05), 0.5), 1, 3);
}

export function generateCandidates(context: RuleContext): RecommendationCandidate[] {
  const { shot, signals, target, comparable } = context;
  const candidates: RecommendationCandidate[] = [];

  if (signals.goodShot) candidates.push(candidate(context, {
    actionType: "KEEP_RECIPE", priorityTier: 1, severity: 1, confidence: confidence(context, shot.overallTasteRating === null ? 0.6 : 0.9, 1),
    title: "Beibehalten – dieser Shot hat funktioniert", explanation: "Der Shot war ausgewogen und hat dir gut geschmeckt. Es gab kein schweres Flow-Problem. Behalte Rezept und Puck Preparation unverändert.",
    changes: [], evidence: [evidence("Geschmack", shot.overallTasteRating ? `${shot.overallTasteRating}/5` : "genau richtig", true), evidence("Balance", "ausgewogen")],
  }));

  const repeatedMediumFlow = comparable.slice(0, 3).filter((item) => (item.channelingSeverity ?? 0) >= 2 || (item.sprayingSeverity ?? 0) >= 2 || (item.flowEvenness ?? 5) <= 3).length >= 2;
  const mixedUnevenTaste = signals.sourSignal >= 0.4 && (signals.bitterSignal >= 0.4 || signals.astringencySignal >= 0.4);
  if (signals.severeFlowProblem || repeatedMediumFlow || mixedUnevenTaste) {
    const usesWdt = shot.prepTools?.some((tool) => tool.toLowerCase() === "wdt") ?? false;
    const actionType = shot.tampLevel === "slanted" ? "LEVEL_TAMP" : usesWdt ? "IMPROVE_DISTRIBUTION" : "USE_WDT";
    const title = actionType === "LEVEL_TAMP" ? "Gerade tampen" : actionType === "USE_WDT" ? "WDT testen, Rezept beibehalten" : "Verteilung reproduzierbarer machen";
    const explanation = actionType === "LEVEL_TAMP"
      ? "Der Tamp wurde schief erfasst und der Flow war instabil. Achte beim nächsten Shot auf einen geraden Tamp. Mahlgrad, Dosis, Zielgewicht und Temperatur bleiben unverändert."
      : usesWdt
        ? "Der Shot zeigte deutlich ungleichmäßigen Flow. Führe WDT bis in die Tiefe durch, richte die Oberfläche aus und tampe gerade. Das restliche Rezept bleibt unverändert."
        : "Der Shot zeigte starkes Channeling. Teste WDT, bevor Mahlgrad oder Yield verändert werden. Dosis, Zielgewicht und Temperatur bleiben unverändert.";
    candidates.push(candidate(context, {
      actionType, priorityTier: 2, severity: signals.severeFlowProblem ? 1 : 0.7,
      confidence: confidence(context, 0.85, signals.severeFlowProblem ? 1 : Math.max(0.5, repeatedMediumFlow ? 0.67 : 0.5)), title, explanation,
      changes: actionType === "USE_WDT" ? [{ field: "prepTools", previousValue: shot.prepTools, recommendedValue: [...(shot.prepTools ?? []), "WDT"] }] : actionType === "LEVEL_TAMP" ? [{ field: "tampLevel", previousValue: shot.tampLevel, recommendedValue: "level" }] : [{ field: "distribution", previousValue: "current", recommendedValue: "improved" }],
      evidence: [evidence("Flow", "stark ungleichmäßig", true), evidence("WDT", usesWdt ? "verwendet" : "nicht verwendet")],
    }));
  }

  const dose = shot.doseGrams;
  const tooHighForBasket = dose !== null && context.basket?.maximumDoseGrams != null && dose > context.basket.maximumDoseGrams;
  if (dose !== null && (shot.showerScreenImprint === true || shot.puckStuck === true || tooHighForBasket)) {
    candidates.push(candidate(context, {
      actionType: "DECREASE_DOSE", priorityTier: 3, severity: shot.showerScreenImprint ? 0.9 : 0.7, confidence: confidence(context, 0.8, 0.8),
      title: `Dosis auf ${formatGerman(Math.max(0.5, dose - 0.5))} g reduzieren`, explanation: `Der Puck zeigt zu wenig Headspace. Reduziere die Dosis von ${formatGerman(dose)} g auf ${formatGerman(Math.max(0.5, dose - 0.5))} g. Mahlgrad, Zielgewicht und Temperatur bleiben unverändert.`,
      changes: [{ field: "doseGrams", previousValue: dose, recommendedValue: Math.max(0.5, dose - 0.5), unit: "g" }], evidence: [evidence("Headspace", shot.showerScreenImprint ? "Duschsieb-Abdruck" : "mechanisch zu knapp", true)],
    }));
  }
  const fineness = normalizedFineness(shot.grindSetting, context.grinder);
  const fineLimit = fineness !== null && context.grinder?.finerDirection ? (context.grinder.finerDirection === "higher" ? context.grinder.maximumSetting === Number(shot.grindSetting) : context.grinder.minimumSetting === Number(shot.grindSetting)) : false;
  if (target && dose !== null && signals.fastShot && fineLimit && context.basket?.nominalDoseGrams != null && dose < context.basket.nominalDoseGrams && !signals.relevantChanneling) {
    candidates.push(candidate(context, {
      actionType: "INCREASE_DOSE", priorityTier: 3, severity: 0.7, confidence: confidence(context, 0.85, 0.7), title: `Dosis auf ${formatGerman(dose + 0.5)} g erhöhen`, explanation: "Die Mühle ist an ihrer sinnvollen feinen Grenze und der Shot läuft weiter deutlich zu schnell. Erhöhe nur die Dosis um 0,5 g; Zielgewicht und Temperatur bleiben unverändert.",
      changes: [{ field: "doseGrams", previousValue: dose, recommendedValue: dose + 0.5, unit: "g" }], evidence: [evidence("Mahlgrad", "feinste konfigurierte Grenze", true)],
    }));
  }

  const addGrind = (direction: "finer" | "coarser", tier: number, technical = false) => {
    if (!target?.targetExtractionTimeSeconds) return;
    const signal = direction === "finer" ? signals.sourSignal : Math.max(signals.bitterSignal, signals.astringencySignal);
    const strong = Math.abs(signals.timeDeviation ?? 0) > 8 || signal >= 0.9 || tasteAgreement(context, direction === "finer" ? "sour" : "bitter") >= 0.67;
    const change = grindChange({ direction, shot, targetTime: target.targetExtractionTimeSeconds, comparable, grinder: context.grinder, strong });
    const actionType = direction === "finer" ? "GRIND_FINER" : "GRIND_COARSER";
    const directionText = direction === "finer" ? "feiner" : "gröber";
    const exact = change.recommended === null ? `${change.steps} ${change.unit}${change.steps === 1 ? "" : "e"} ${directionText} mahlen` : `Mahlgrad auf ${change.recommended} stellen`;
    candidates.push(candidate(context, {
      actionType, priorityTier: tier, severity: strong ? 1 : 0.7, confidence: confidence(context, technical ? 0.6 : 1, technical ? 0.5 : tasteAgreement(context, direction === "finer" ? "sour" : "bitter"), 1), title: technical ? `${exact} testen` : exact,
      explanation: technical
        ? `Der Shot wich deutlich von deinem Zielrezept ab. Da keine Geschmacksbewertung vorhanden ist, ist dies ein einzelnes Experiment. Dosis, Zielgewicht und Temperatur bleiben unverändert.`
        : `Der Shot lief ${direction === "finer" ? "schneller" : "langsamer"} als dein Ziel und schmeckte ${direction === "finer" ? "sauer" : "bitter oder trocken"}. Da kein relevantes Channeling erfasst wurde, ändere nur den Mahlgrad. Dosis, Zielgewicht und Temperatur bleiben unverändert.`,
      changes: [{ field: "grindSetting", previousValue: shot.grindSetting, recommendedValue: change.recommended ?? `${change.steps} ${change.unit} ${directionText}`, unit: change.unit }],
      evidence: [evidence("Zeitabweichung", `${formatGerman(signals.timeDeviation ?? 0)} s`, true), ...(technical ? [] : [evidence("Geschmack", direction === "finer" ? "sauer" : "bitter/trocken")])],
    }));
  };
  if (target && signals.sourSignal >= 0.4 && signals.fastShot && !signals.relevantChanneling) addGrind("finer", 4);
  if (target && (signals.bitterSignal >= 0.4 || signals.astringencySignal >= 0.4) && signals.slowShot && !signals.relevantChanneling) addGrind("coarser", 5);

  if (target?.targetYieldGrams != null && signals.timeNearTarget && !signals.relevantChanneling && !context.yieldAdjustmentTested && !context.ratioLimitReached) {
    const addYield = (direction: "increase" | "decrease", tier: number, signal: number, strength = false) => {
      const delta = yieldDelta(target.targetYieldGrams as number, signal >= 0.9);
      const next = (target.targetYieldGrams as number) + (direction === "increase" ? delta : -delta);
      const actionType = direction === "increase" ? "INCREASE_YIELD" : "DECREASE_YIELD";
      candidates.push(candidate(context, {
        actionType, priorityTier: tier, severity: signal, confidence: confidence(context, strength ? 0.8 : 1, strength ? 0.5 : tasteAgreement(context, direction === "increase" ? "sour" : "bitter")),
        title: `Zielgewicht auf ${formatGerman(next)} g ${direction === "increase" ? "erhöhen" : "reduzieren"}`,
        explanation: `Die Extraktionszeit lag nahe an deinem Ziel. ${strength ? "Die Balance stimmt, aber die Stärke noch nicht." : `Der Shot wirkte ${direction === "increase" ? "sauer" : "bitter oder trocken"}.`} Ändere nur das Zielgewicht auf ${formatGerman(next)} g; Dosis, Mahlgrad und Temperatur bleiben unverändert.`,
        changes: [{ field: "targetYieldGrams", previousValue: target.targetYieldGrams, recommendedValue: next, unit: "g" }], evidence: [evidence("Extraktionszeit", "nahe am Ziel", true)],
      }));
    };
    if (signals.sourSignal >= 0.4) addYield("increase", 6, signals.sourSignal);
    if (signals.bitterSignal >= 0.4 || signals.astringencySignal >= 0.4) addYield("decrease", 7, Math.max(signals.bitterSignal, signals.astringencySignal));
    if (Math.abs(shot.tasteBalance ?? 99) <= 0.5 && shot.strengthPerception !== null && shot.strengthPerception !== 0) addYield(shot.strengthPerception < 0 ? "decrease" : "increase", 8, Math.min(1, Math.abs(shot.strengthPerception) / 2), true);
  }

  const repeatedTaste = (kind: "sour" | "bitter") => comparable.filter((item) => kind === "sour" ? (item.tasteBalance ?? 0) <= -1 : (item.tasteBalance ?? 0) >= 1 || (item.astringencySeverity ?? 0) >= 2).length >= 2;
  const ratiosNear = target?.doseGrams && target.targetYieldGrams && signals.brewRatio !== null ? Math.abs(signals.brewRatio - target.targetYieldGrams / target.doseGrams) <= 0.15 : false;
  if (context.machine?.temperatureAdjustable && target && signals.timeNearTarget && ratiosNear && !signals.relevantChanneling && (context.yieldAdjustmentTested || context.ratioLimitReached)) {
    const addTemperature = (direction: "increase" | "decrease") => {
      const current = shot.temperatureCelsius ?? target.temperatureCelsius;
      if (current === null) return;
      const next = current + (direction === "increase" ? 1 : -1);
      if (context.machine?.minimumTemperature != null && next < context.machine.minimumTemperature || context.machine?.maximumTemperature != null && next > context.machine.maximumTemperature) return;
      const actionType = direction === "increase" ? "INCREASE_TEMPERATURE" : "DECREASE_TEMPERATURE";
      candidates.push(candidate(context, {
        actionType, priorityTier: 9, severity: 0.55, confidence: confidence(context, 1, 0.75), title: `Temperatur auf ${formatGerman(next, 0)} °C ${direction === "increase" ? "erhöhen" : "reduzieren"}`,
        explanation: `Das gleiche Geschmacksproblem trat bei vergleichbaren Shots wiederholt auf, während Zeit und Ratio am Ziel lagen. Ändere nur die Temperatur um 1 °C; Dosis, Mahlgrad und Zielgewicht bleiben unverändert.`, changes: [{ field: "temperatureCelsius", previousValue: current, recommendedValue: next, unit: "°C" }], evidence: [evidence("Muster", "mindestens 2 vergleichbare Shots", true)],
      }));
    };
    if (signals.sourSignal >= 0.4 && repeatedTaste("sour")) addTemperature("increase");
    if ((signals.bitterSignal >= 0.4 || signals.astringencySignal >= 0.4) && repeatedTaste("bitter")) addTemperature("decrease");
  }

  if (target && !signals.hasTasteData && !signals.relevantChanneling) {
    if (signals.fastShot) addGrind("finer", 10, true);
    if (signals.slowShot) addGrind("coarser", 10, true);
  }

  candidates.push(candidate(context, {
    actionType: "COLLECT_MORE_DATA", priorityTier: 11, severity: 0.3, confidence: confidence(context, 0.4, 0.5, 0.6), expectedImpact: 0.4,
    title: "Beim nächsten Shot mehr Daten erfassen", explanation: "Für eine belastbare einzelne Änderung fehlen noch Zielrezept oder Messwerte. Tracke Geschmack, finales Gewicht und Extraktionszeit. Bis dahin wird keine konkrete Anpassung erfunden.",
    changes: [], evidence: [evidence("Datenbasis", target ? "Geschmack oder Messwerte fehlen" : "kein Zielrezept", true)],
  }));
  return candidates;
}

export function candidateScore(value: RecommendationCandidate) {
  return 0.4 * value.severity + 0.35 * value.confidence + 0.15 * value.expectedImpact + 0.1 * value.personalEffectiveness;
}
