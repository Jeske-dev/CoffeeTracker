import { Gauge, Scale, Weight } from "lucide-react";
import { DataMetric } from "@/components/ui/data-metric";
import { formatWeight } from "@/lib/formatting";
import { resolveNextShotTargets } from "@/features/recommendations/next-shot-targets";
import type { RecommendationBundleRecord, ShotSummary } from "@/types/domain";

export function NextShotTargets({ recommendation, latestShot }: { recommendation: RecommendationBundleRecord | null; latestShot: ShotSummary | null }) {
  const targets = resolveNextShotTargets(recommendation, latestShot);

  return <section className="mt-2.5 grid grid-cols-3 gap-2" aria-label="Zielwerte für den nächsten Shot">
    <TargetMetric icon={Scale} label="Kaffee" accessibleLabel="Kaffeemenge" value={formatWeight(targets.doseGrams)} changed={targets.changed.dose} />
    <TargetMetric icon={Gauge} label="Mahlgrad" value={targets.grindSetting ?? "—"} changed={targets.changed.grind} />
    <TargetMetric icon={Weight} label="Stop" accessibleLabel="Stop-Gewicht" value={formatWeight(targets.stopWeightGrams)} changed={targets.changed.stop} />
  </section>;
}

function TargetMetric({ icon, label, accessibleLabel = label, value, changed }: { icon: typeof Scale; label: string; accessibleLabel?: string; value: string; changed: boolean }) {
  return <article aria-label={`${accessibleLabel}: ${value}`} className={`min-w-0 rounded-[16px] border px-3 py-3 ${changed ? "border-[var(--dialed-sage)]/30 bg-[var(--dialed-sage-soft)]/55" : "bg-white"}`}>
    <DataMetric icon={icon} label={label} value={value} iconClassName={changed ? "text-[var(--dialed-sage)]" : "text-[var(--dialed-crema)]"} valueClassName="mt-2 text-[15px]" />
  </article>;
}
