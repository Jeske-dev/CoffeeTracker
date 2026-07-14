import Link from "next/link";
import { Gauge, Timer, Weight } from "lucide-react";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";
import { DataMetric } from "@/components/ui/data-metric";
import { formatDateTime, formatTime } from "@/lib/formatting";
import type { ShotSummary } from "@/types/domain";
import { TasteBadge } from "./shot-visuals";

const compactWeight = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export function ShotCard({ shot }: { shot: ShotSummary }) {
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
      <div className="mt-4 grid grid-cols-3 divide-x border-y py-3">
        <DataMetric icon={Gauge} label="Mahlgrad" value={shot.grind_setting ?? "—"} align="center" className="px-2 first:pl-0 last:pr-0" valueClassName="text-[13px]" />
        <DataMetric icon={Timer} label="Zeit" value={formatTime(shot.extraction_seconds)} align="center" className="px-2 first:pl-0 last:pr-0" valueClassName="text-[13px]" />
        <DataMetric icon={Weight} label="Stop / Final" value={formatWeightPair(shot.stop_weight_grams, shot.final_yield_grams)} align="center" className="px-2 first:pl-0 last:pr-0" valueClassName="whitespace-nowrap text-[11px]" truncateValue={false} />
      </div>
    </Link>
  );
}

function formatWeightPair(stopWeight: number | null, finalWeight: number | null) {
  const stop = stopWeight === null ? "—" : compactWeight.format(stopWeight);
  const final = finalWeight === null ? "—" : compactWeight.format(finalWeight);
  return `${stop} / ${final} g`;
}
