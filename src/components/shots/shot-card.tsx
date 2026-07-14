import Link from "next/link";
import { ChartNoAxesColumnIncreasing, Gauge, Timer, Weight } from "lucide-react";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";
import { brewRatio } from "@/lib/calculations";
import { formatDateTime, formatTime, formatWeight } from "@/lib/formatting";
import type { ShotSummary } from "@/types/domain";
import { RatioVisual, TasteBadge } from "./shot-visuals";

export function ShotCard({ shot }: { shot: ShotSummary }) {
  const ratio = brewRatio(shot.final_yield_grams, shot.dose_grams);

  return (
    <Link href={`/app/shots/${shot.id}`} className="block rounded-[18px] border bg-white p-4 shadow-[0_7px_18px_rgba(54,34,24,.05)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dialed-crema)]">
      <div className="grid grid-cols-[46px_minmax(0,1fr)] items-center gap-3">
        <EntityIconFrame size="lg"><BeanIcon origin={shot.beans?.origin} className="text-[22px] [&_svg]:size-5" /></EntityIconFrame>
        <div className="min-w-0">
          <strong className="block truncate text-sm">{shot.beans?.name ?? "Unbekannte Bohne"}</strong>
          <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate text-xs text-[var(--dialed-text-muted)]">{formatDateTime(shot.shot_at)}</span>
            <TasteBadge taste={shot.taste} />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 sm:grid-cols-4">
        <ShotMetric icon={Gauge} label="Mahlgrad" value={shot.grind_setting ?? "—"} />
        <ShotMetric icon={Timer} label="Extraktionszeit" value={formatTime(shot.extraction_seconds)} />
        <ShotMetric icon={Weight} label="Stop / Final" value={formatWeightPair(shot.stop_weight_grams, shot.final_yield_grams)} />
        <div className="min-w-0">
          <span className="flex items-center gap-1.5 text-xs text-[var(--dialed-text-muted)]"><ChartNoAxesColumnIncreasing aria-hidden="true" className="size-3.5" />Ratio</span>
          <RatioVisual ratio={ratio} compact />
        </div>
      </div>
    </Link>
  );
}

function ShotMetric({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return <div className="min-w-0">
    <span className="flex items-center gap-1.5 text-xs text-[var(--dialed-text-muted)]"><Icon aria-hidden="true" className="size-3.5" />{label}</span>
    <strong className="mt-1.5 block truncate text-[13px]">{value}</strong>
  </div>;
}

function formatWeightPair(stopWeight: number | null, finalWeight: number | null) {
  const stop = formatWeight(stopWeight).replace(" g", "");
  const final = formatWeight(finalWeight);
  return `${stop} / ${final}`;
}
