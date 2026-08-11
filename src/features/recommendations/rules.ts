import { grindChange } from "./grind-sensitivity";
import { TARGET_EXTRACTION_MAX_SECONDS, TARGET_EXTRACTION_MIN_SECONDS } from "./policy";
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

function usesWdt(shot: RecommendationShot) {
  return shot.prepTools?.some((tool) => tool.toLowerCase() === "wdt") ?? false;
}

export function generateCandidates(context: RuleContext): RecommendationCandidate[] {
  const { shot, signals, comparable } = context;
  const candidates: RecommendationCandidate[] = [];
  const grindDirection = signals.fastShot ? "finer" as const : signals.slowShot ? "coarser" as const : null;

  if (grindDirection) {
    const change = grindChange({ direction: grindDirection, shot, grinder: context.grinder });
    if (change.recommended !== null) {
      const finer = grindDirection === "finer";
      candidates.push(candidate(context, {
        actionType: finer ? "GRIND_FINER" : "GRIND_COARSER",
        priorityTier: 1,
        severity: 0.9,
        confidence: 0.9,
        title: `Mahlgrad auf ${change.recommended} stellen`,
        explanation: finer
          ? `Der Shot lief unter ${TARGET_EXTRACTION_MIN_SECONDS} Sekunden. Stelle den Mahlgrad um 0,33 feiner, also auf eine größere Zahl.`
          : `Der Shot lief über ${TARGET_EXTRACTION_MAX_SECONDS} Sekunden. Stelle den Mahlgrad um 0,33 gröber, also auf eine kleinere Zahl.`,
        changes: [{
          field: "grindSetting",
          previousValue: shot.grindSetting,
          recommendedValue: change.recommended,
          unit: change.unit,
        }],
        evidence: [evidence("Extraktionszeit", `${formatGerman(shot.extractionTimeSeconds ?? 0)} s`, true)],
      }));
    }
  }

  if (signals.goodShot) {
    candidates.push(candidate(context, {
      actionType: "KEEP_RECIPE",
      priorityTier: 1,
      severity: 1,
      confidence: 0.9,
      title: "Beibehalten - dieser Shot hat gut funktioniert.",
      explanation: `Geschmack und Extraktionszeit liegen im Zielbereich von ${TARGET_EXTRACTION_MIN_SECONDS} bis ${TARGET_EXTRACTION_MAX_SECONDS} Sekunden.`,
      changes: [],
      evidence: [evidence("Extraktionszeit", `${formatGerman(shot.extractionTimeSeconds ?? 0)} s`, true), evidence("Geschmack", "ausgewogen")],
    }));
  }

  const repeatedMinorChanneling = comparable.slice(0, 3).filter((item) => item.extractionPicture === "minor_channeling").length >= 2;
  if (signals.severeChanneling || repeatedMinorChanneling) {
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
        ? "Verteile das Kaffeemehl mit WDT gleichmäßiger und lasse Dosis sowie Zielgewicht unverändert."
        : "Teste beim nächsten Shot WDT und lasse Dosis sowie Zielgewicht unverändert.",
      changes: [{ field: "prepTools", previousValue: shot.prepTools, recommendedValue: nextTools }],
      evidence: [evidence("Extraktionsbild", signals.severeChanneling ? "starkes Channeling" : "wiederholt leichtes Channeling", true)],
    }));
  }

  candidates.push(candidate(context, {
    actionType: "COLLECT_MORE_DATA",
    priorityTier: 9,
    severity: 0.3,
    confidence: 0.3,
    title: "Mehr Daten sammeln",
    explanation: `Zwischen ${TARGET_EXTRACTION_MIN_SECONDS} und ${TARGET_EXTRACTION_MAX_SECONDS} Sekunden bleibt der Mahlgrad unverändert. Weitere Shots verbessern die Stopgewicht-Berechnung.`,
    changes: [],
    evidence: [evidence("Datenbasis", "keine Änderung nötig", true)],
  }));

  return candidates;
}

export function candidateScore(value: RecommendationCandidate) {
  return value.confidence + value.severity;
}
