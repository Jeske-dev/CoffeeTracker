import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import { requireUser } from "@/lib/supabase/auth";
import { loadShotDetailData } from "@/features/data/queries";
import { formatDateTime } from "@/lib/formatting";
import { tasteLevelFromShot, tasteLevelValues } from "@/lib/taste-scale";
import { DeleteShotButton } from "@/components/shots/delete-shot-button";
import { ShotComparisonChart } from "@/components/shots/shot-comparison-chart";
import { ShotDetailSummary, ShotMoreDetails } from "@/components/shots/shot-detail-summary";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";
import type { ShotWithBean } from "@/types/domain";

export default async function ShotDetail({ params }: PageProps<"/app/shots/[shotId]">) {
  const { shotId } = await params;
  const { supabase, userId } = await requireUser();
  const { shot, shots, equipment } = await loadShotDetailData(userId, shotId, supabase);
  if (!shot) notFound();
  const issues = shotIssues(shot);
  const equipmentItem = (id: string | null) => equipment.find((item) => item.id === id) ?? null;
  const beanMeta = [shot.beans?.roaster, shot.beans?.origin].filter(Boolean).join(" · ");

  return <div className="pb-4">
    <header className="mb-5 flex items-center gap-3">
      <Link href="/app/shots" aria-label="Zurück" className="grid size-11 place-items-center rounded-full bg-[var(--dialed-surface-subtle)]"><ArrowLeft className="size-4" /></Link>
      <EntityIconFrame size="lg"><BeanIcon origin={shot.beans?.origin} className="text-[22px] [&_svg]:size-5" /></EntityIconFrame>
      <div className="min-w-0">
        <p className="text-xs text-[var(--dialed-text-muted)]">{formatDateTime(shot.shot_at)}</p>
        <h1 className="truncate font-display text-[28px] font-medium">{shot.beans?.name ?? "Shot"}</h1>
        {beanMeta && <p className="mt-0.5 truncate text-xs text-[var(--dialed-text-secondary)]">{beanMeta}</p>}
      </div>
    </header>

    <ShotDetailSummary shot={shot} />

    <section className={`mt-3 rounded-[22px] border p-4 ${issues.length ? "border-[var(--dialed-rose)]/20 bg-[var(--dialed-rose-soft)]/55" : "border-[var(--dialed-sage)]/20 bg-[var(--dialed-sage-soft)]/65"}`}>
      <div className="flex items-start gap-3">{issues.length ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--dialed-rose)]" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--dialed-sage)]" />}<div><h2 className="text-sm font-extrabold">{issues.length ? issues[0].title : "Keine klaren Probleme"}</h2><p className="mt-1 text-xs leading-5 text-[var(--dialed-text-secondary)]">{issues.length ? issues[0].detail : "Bewertung und Extraktionsbild zeigen kein klares Problem."}</p></div></div>
      {issues.slice(1).map((issue) => <div key={issue.title} className="mt-2 border-t border-black/5 pt-2 text-xs leading-5"><strong>{issue.title}</strong><span className="ml-1 text-[var(--dialed-text-secondary)]">{issue.detail}</span></div>)}
    </section>

    <ShotMoreDetails shot={shot} machine={equipmentItem(shot.machine_id)} grinder={equipmentItem(shot.grinder_id)} basket={equipmentItem(shot.basket_id)} />

    <section className="mt-3 rounded-[24px] border bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-2 flex items-start justify-between gap-3"><div><h2 className="text-sm font-extrabold">Vergleich</h2><p className="mt-1 text-xs leading-5 text-[var(--dialed-text-muted)]">Dieser Shot gegen ähnliche Extraktionen.</p></div><span className="shrink-0 rounded-full bg-[var(--dialed-sage-soft)] px-2.5 py-1.5 text-xs font-bold text-[var(--dialed-sage)]">Zeit × Ratio</span></div>
      <ShotComparisonChart shot={shot} shots={shots} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--dialed-text-muted)]"><span><i className="mr-1 inline-block size-2 rounded-full bg-[var(--dialed-espresso)]" />Dieser Shot</span><span>{shot.target_recipe_snapshot ? "Persönliches Ziel grün" : "Noch kein Zielrezept"}</span></div>
    </section>

    <div className="mt-5 flex gap-2">
      <Link href={`/app/shots/${shot.id}/edit`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--dialed-espresso)] px-4 text-sm font-medium text-white"><Pencil className="size-4" />Bearbeiten</Link>
      <DeleteShotButton userId={userId} id={shot.id} beanId={shot.bean_id} />
    </div>
  </div>;
}

type Issue = { title: string; detail: string };

function shotIssues(shot: ShotWithBean): Issue[] {
  const issues: Issue[] = [];
  const tasteLevel = tasteLevelFromShot(shot.taste, shot.overall_taste_rating);
  if (shot.flow === "channeling") issues.push({ title: "Starkes Channeling", detail: "WDT und Verteilung zuerst stabilisieren; das restliche Rezept unverändert lassen." });
  if (shot.flow === "minor_channeling") issues.push({ title: "Leichtes Channeling", detail: "Beobachte, ob sich das Extraktionsbild bei den nächsten Shots wiederholt." });
  if (tasteLevel && tasteLevel !== "balanced") issues.push({ title: "Geschmack nicht ausgewogen", detail: tasteLevelValues[tasteLevel].label });
  if (!shot.taste && shot.overall_taste_rating === null) issues.push({ title: "Geschmack fehlt", detail: "Eine kurze Einordnung hilft bei den nächsten Shots." });
  return issues.slice(0, 3);
}
