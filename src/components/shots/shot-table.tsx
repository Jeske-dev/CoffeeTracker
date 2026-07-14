"use client";

import { useRouter } from "next/navigation";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";
import { brewRatio } from "@/lib/calculations";
import { formatDateTime, formatRatio, formatTime, formatWeight } from "@/lib/formatting";
import type { ShotSummary } from "@/types/domain";
import { TasteBadge } from "./shot-visuals";

export function ShotTable({ shots }: { shots: ShotSummary[] }) {
  const router = useRouter();

  const openShot = (id: string) => router.push(`/app/shots/${id}`);
  const prefetchShot = (id: string) => router.prefetch(`/app/shots/${id}`);

  return <div className="overflow-x-auto rounded-[18px] border bg-white shadow-[0_7px_18px_rgba(54,34,24,.05)]">
    <table className="w-full min-w-[680px] border-collapse text-left text-xs">
      <thead>
        <tr className="border-b bg-[var(--dialed-surface-subtle)] text-[var(--dialed-text-secondary)]">
          {['Bohne', 'Mahlgrad', 'Zeit', 'Stop', 'Final', 'Ratio', 'Geschmack'].map((label, index) => <th key={label} scope="col" className={`${index === 0 ? "sticky left-0 z-10 min-w-[200px] bg-[var(--dialed-surface-subtle)]" : ""} whitespace-nowrap px-3 py-3 font-bold`}>{label}</th>)}
        </tr>
      </thead>
      <tbody>
        {shots.map((shot) => <tr
          key={shot.id}
          role="link"
          tabIndex={0}
          aria-label={`Shot mit ${shot.beans?.name ?? "unbekannter Bohne"} vom ${formatDateTime(shot.shot_at)} öffnen`}
          onClick={() => openShot(shot.id)}
          onMouseEnter={() => prefetchShot(shot.id)}
          onFocus={() => prefetchShot(shot.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openShot(shot.id);
            }
          }}
          className="group cursor-pointer border-b last:border-0 hover:bg-[var(--dialed-crema-soft)]/35 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--dialed-crema)]"
        >
          <td className="sticky left-0 z-[5] bg-white px-3 py-3 group-hover:bg-[var(--dialed-crema-soft)]">
            <div className="flex min-w-0 items-center gap-2.5">
              <EntityIconFrame size="md"><BeanIcon origin={shot.beans?.origin} /></EntityIconFrame>
              <span className="min-w-0">
                <strong className="block max-w-[132px] truncate text-[13px]">{shot.beans?.name ?? "Unbekannte Bohne"}</strong>
                <span className="mt-0.5 block whitespace-nowrap text-xs text-[var(--dialed-text-muted)]">{formatDateTime(shot.shot_at)}</span>
              </span>
            </div>
          </td>
          <td className="whitespace-nowrap px-3 py-3 font-bold">{shot.grind_setting ?? "—"}</td>
          <td className="whitespace-nowrap px-3 py-3 font-bold">{formatTime(shot.extraction_seconds)}</td>
          <td className="whitespace-nowrap px-3 py-3 font-bold">{formatWeight(shot.stop_weight_grams)}</td>
          <td className="whitespace-nowrap px-3 py-3 font-bold">{formatWeight(shot.final_yield_grams)}</td>
          <td className="whitespace-nowrap px-3 py-3 font-bold">{formatRatio(brewRatio(shot.final_yield_grams, shot.dose_grams))}</td>
          <td className="whitespace-nowrap px-3 py-3"><TasteBadge taste={shot.taste} /></td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
