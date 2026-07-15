import { Gauge, Scale, Weight } from "lucide-react";
import { DataMetric } from "@/components/ui/data-metric";
import { formatWeight } from "@/lib/formatting";
import { resolveNextShotTargets } from "@/features/recommendations/next-shot-targets";
import type { ShotSummary } from "@/types/domain";

export function NextShotTargets({ latestShot, history }: { latestShot: ShotSummary | null; history: ShotSummary[] }) {
  const targets = resolveNextShotTargets(latestShot, history);

  return <section className="mt-4 grid grid-cols-3 border border-black bg-white" aria-label="Zielwerte für den nächsten Shot">
    <TargetMetric icon={Scale} label="Kaffee" accessibleLabel="Kaffeemenge" value={formatWeight(targets.doseGrams)} changed={targets.changed.dose} />
    <TargetMetric icon={Gauge} label="Mahlgrad" value={targets.grindSetting ?? "—"} changed={targets.changed.grind} />
    <TargetMetric icon={Weight} label="Stop" accessibleLabel="Stop-Gewicht" value={formatWeight(targets.stopWeightGrams)} changed={targets.changed.stop} />
  </section>;
}

function TargetMetric({ icon, label, accessibleLabel = label, value, changed }: { icon: typeof Scale; label: string; accessibleLabel?: string; value: string; changed: boolean }) {
  const status = value === "—" ? "Noch kein Zielwert" : changed ? "Neu empfohlen" : "Vom letzten Shot";
  return <article aria-label={`${accessibleLabel}: ${value}. ${status}`} className={`min-w-0 border-r px-3 py-4 last:border-r-0 ${changed ? "bg-[var(--crema-surface-mid)]" : "bg-white"}`}>
    <DataMetric icon={icon} label={label} value={value} iconClassName="text-black" valueClassName="mt-2 text-base" />
    <p className="mt-3 border-t border-black/15 pt-2 text-[8px] font-semibold leading-3 text-[var(--dialed-text-muted)] uppercase">{status}</p>
  </article>;
}
