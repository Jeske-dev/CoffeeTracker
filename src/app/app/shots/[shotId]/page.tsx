import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireUser } from "@/lib/supabase/auth";
import { loadShotDetailData } from "@/features/data/queries";
import { formatDateTime } from "@/lib/formatting";
import { DeleteShotButton } from "@/components/shots/delete-shot-button";
import { ShotComparisonChart } from "@/components/shots/shot-comparison-chart";
import { ShotDetailSummary, ShotMoreDetails } from "@/components/shots/shot-detail-summary";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";
import { buildShotComparisonSeries } from "@/features/shots/comparison-series";

export default async function ShotDetail({ params }: PageProps<"/app/shots/[shotId]">) {
  const { shotId } = await params;
  const { supabase, userId } = await requireUser();
  const { shot, shots, equipment } = await loadShotDetailData(userId, shotId, supabase);
  if (!shot) notFound();
  const comparisonSeries = buildShotComparisonSeries(shot, shots);
  const equipmentItem = (id: string | null) => equipment.find((item) => item.id === id) ?? null;
  const beanMeta = [shot.beans?.roaster, shot.beans?.origin].filter(Boolean).join(" · ");

  return <div className="pb-4">
    <header className="mb-6 flex items-center gap-3 border-b border-black pb-5">
      <Link href="/app/shots" aria-label="Zurück" className="grid size-11 place-items-center border border-black bg-white hover:bg-black hover:text-white"><ArrowLeft className="size-4" /></Link>
      <EntityIconFrame size="lg"><BeanIcon origin={shot.beans?.origin} className="text-[22px] [&_svg]:size-5" /></EntityIconFrame>
      <div className="min-w-0">
        <p className="text-xs text-[var(--dialed-text-muted)]">{formatDateTime(shot.shot_at)}</p>
        <h1 className="truncate font-display text-[30px] font-bold leading-[1.15]">{shot.beans?.name ?? "Shot"}</h1>
        {beanMeta && <p className="mt-0.5 truncate text-xs text-[var(--dialed-text-secondary)]">{beanMeta}</p>}
      </div>
    </header>

    <ShotDetailSummary shot={shot} />

    <ShotMoreDetails shot={shot} machine={equipmentItem(shot.machine_id)} grinder={equipmentItem(shot.grinder_id)} basket={equipmentItem(shot.basket_id)} />

    <section className="mt-4 border bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-black pb-4"><div><h2 className="font-display text-[18px] font-semibold">Vergleich</h2><p className="mt-1 text-xs leading-5 text-[var(--dialed-text-muted)]">Dieser Shot gegen ähnliche Extraktionen.</p></div><span className="shrink-0 border border-black bg-[var(--crema-surface-mid)] px-2.5 py-1.5 text-[10px] font-semibold tracking-[.08em] text-black uppercase">Zeit × Ratio</span></div>
      <ShotComparisonChart series={comparisonSeries} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-[var(--dialed-text-muted)]"><span><i className="mr-1 inline-block size-2 bg-black" />Dieser Shot</span><span>{shot.target_recipe_snapshot ? "Persönlicher Zielbereich" : "Noch kein Zielrezept"}</span></div>
    </section>

    <div className="mt-5 flex gap-2">
      <Link href={`/app/shots/${shot.id}/edit`} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 border border-black bg-black px-4 text-[11px] font-semibold tracking-[.1em] text-white uppercase hover:bg-white hover:text-black"><Pencil className="size-4" />Bearbeiten</Link>
      <DeleteShotButton userId={userId} id={shot.id} beanId={shot.bean_id} />
    </div>
  </div>;
}
