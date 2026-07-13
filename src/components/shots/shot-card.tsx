import Link from "next/link";
import { brewRatio, TASTE_COLORS } from "@/lib/calculations";
import { formatDateTime, formatRatio, formatTime, formatWeight } from "@/lib/formatting";
import type { ShotWithBean } from "@/types/domain";

export function ShotCard({ shot }: { shot: ShotWithBean }) {
  const provisional = shot.score_coverage !== null && shot.score_coverage < 70;
  return (
    <Link href={`/app/shots/${shot.id}`} className="grid grid-cols-[46px_1fr_auto] items-center gap-3 rounded-[18px] border bg-white p-3.5 shadow-[0_7px_18px_rgba(54,34,24,.05)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]">
      <div className="score-ring relative grid size-[46px] place-items-center rounded-full" style={{ "--score": shot.score ?? 0 } as React.CSSProperties}><span className="relative z-10 text-xs font-extrabold">{shot.score ?? "—"}</span></div>
      <div className="min-w-0"><strong className="block truncate text-[13px]">{shot.beans?.name ?? "Unbekannte Bohne"}</strong><span className="mt-1 block truncate text-[10px] text-[var(--dialed-text-muted)]">{formatDateTime(shot.shot_at)} · Mahlgrad {shot.grind_setting ?? "—"}</span>{provisional && <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">Vorläufig</span>}</div>
      <div className="text-right"><strong className="block whitespace-nowrap text-xs">{formatWeight(shot.dose_grams).replace(" g", "")} → {formatWeight(shot.final_yield_grams)}</strong><span className="mt-1 block whitespace-nowrap text-[9px] text-[var(--dialed-text-muted)]"><i className="mr-1 inline-block size-[7px] rounded-full" style={{ background: shot.taste ? TASTE_COLORS[shot.taste] : "#b8ada6" }} />{formatTime(shot.extraction_seconds)} · {formatRatio(brewRatio(shot.final_yield_grams, shot.dose_grams))}</span></div>
    </Link>
  );
}
