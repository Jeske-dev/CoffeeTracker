import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import { requireUser } from "@/lib/supabase/auth";
import { loadShotDetailData } from "@/features/data/queries";
import { brewRatio, postStopDrip } from "@/lib/calculations";
import { formatDateTime, formatRatio, formatTime, formatWeight, tasteLabel } from "@/lib/formatting";
import { DeleteShotButton } from "@/components/shots/delete-shot-button";
import { ShotComparisonChart } from "@/components/shots/shot-comparison-chart";
import { ShotExtractionSection, ShotReviewSection, ShotSetupSection } from "@/components/shots/shot-sections";
import { BeanIdentity, EquipmentIdentity } from "@/components/entities/entity-icons";
import { NextShotCard } from "@/features/recommendations/components/next-shot-card";
import { RecommendationHistory } from "@/features/recommendations/components/recommendation-history";
import { RECOMMENDATION_ENGINE_VERSION } from "@/features/recommendations/types";
import type { ShotWithBean } from "@/types/domain";

export default async function ShotDetail({ params }: PageProps<"/app/shots/[shotId]">) {
  const { shotId } = await params;
  const { supabase, userId } = await requireUser();
  const { shot, shots, equipment, recommendations } = await loadShotDetailData(userId, shotId, supabase);
  if (!shot) notFound();
  const sourceRecommendation = recommendations.find((item) => item.source_shot_id === shot.id && item.engine_version === RECOMMENDATION_ENGINE_VERSION) ?? null;
  const appliedRecommendation = recommendations.find((item) => item.resulting_shot_id === shot.id || item.id === shot.applied_recommendation_id) ?? null;
  const ratio = brewRatio(shot.final_yield_grams, shot.dose_grams);
  const overshoot = postStopDrip(shot.final_yield_grams, shot.stop_weight_grams);
  const issues = shotIssues(shot);
  const equipmentItem = (id: string | null) => equipment.find((item) => item.id === id) ?? null;
  const prepTool = (tool: "WDT" | "Puck Screen") => shot.prep_tools?.includes(tool) ? "Verwendet" : "Nicht verwendet";

  return <div className="pb-4">
    <header className="mb-5 flex items-center gap-3">
      <Link href="/app/shots" aria-label="Zurück" className="grid size-11 place-items-center rounded-full bg-[var(--dialed-surface-subtle)]"><ArrowLeft className="size-4" /></Link>
      <div className="min-w-0"><p className="text-[10px] uppercase tracking-[.12em] text-[var(--dialed-text-muted)]">{formatDateTime(shot.shot_at)}</p><h1 className="truncate font-display text-[30px] font-medium">{shot.beans?.name ?? "Shot"}</h1></div>
    </header>

    <ShotSetupSection mode="view" fields={{
      bean: { value: <BeanIdentity bean={shot.beans} fallback="Nicht angegeben" /> },
      machine: { value: <EquipmentIdentity equipment={equipmentItem(shot.machine_id)} type="machine" fallback="Nicht angegeben" /> },
      grinder: { value: <EquipmentIdentity equipment={equipmentItem(shot.grinder_id)} type="grinder" fallback="Nicht angegeben" /> },
      grind: { value: shot.grind_setting ?? "Nicht angegeben" },
      dose: { value: formatWeight(shot.dose_grams) },
      wdt: { value: prepTool("WDT") },
      puckScreen: { value: prepTool("Puck Screen") },
    }} />

    <ShotExtractionSection mode="view" fields={{
      time: { value: formatTime(shot.extraction_seconds) },
      finalYield: { value: formatWeight(shot.final_yield_grams) },
      ratio: { value: formatRatio(ratio) },
      stopWeight: shot.stop_weight_grams === null ? undefined : { value: formatWeight(shot.stop_weight_grams) },
      overshoot: overshoot === null ? undefined : { value: formatWeight(overshoot) },
    }} />

    <ShotReviewSection mode="view" fields={{
      rating: { value: shot.overall_taste_rating === null ? "Nicht angegeben" : `${shot.overall_taste_rating} / 5` },
      taste: { value: tasteLabel(shot.taste) },
      extractionPicture: { value: extractionPictureLabel(shot.flow) },
      puck: { value: puckLabel(shot.puck) },
      notes: { value: shot.notes || "Keine Notiz" },
      score: { value: <div className="flex items-center gap-3"><strong className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--dialed-espresso)] font-display text-xl text-white">{shot.score ?? "—"}</strong><span className="min-w-0"><strong className="block text-xs">{shot.score_coverage === null ? "Keine Datenabdeckung" : `${Math.round(shot.score_coverage)}% · ${shot.score_status}`}</strong>{shot.score === null && !shot.taste && shot.overall_taste_rating === null && <small className="mt-1 block text-[9px] leading-4 text-[var(--dialed-text-muted)]">Für einen vollständigen Score fehlt noch eine kurze Geschmacksbewertung.</small>}</span></div> },
    }} />

    <section className={`mt-3 rounded-[22px] border p-4 ${issues.length ? "border-[var(--dialed-rose)]/20 bg-[var(--dialed-rose-soft)]/55" : "border-[var(--dialed-sage)]/20 bg-[var(--dialed-sage-soft)]/65"}`}>
      <div className="flex items-start gap-3">{issues.length ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--dialed-rose)]" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--dialed-sage)]" />}<div><h2 className="text-sm font-extrabold">{issues.length ? issues[0].title : "Keine klaren Probleme"}</h2><p className="mt-1 text-[10px] leading-4 text-[var(--dialed-text-secondary)]">{issues.length ? issues[0].detail : "Bewertung und Extraktionsbild zeigen kein klares Problem."}</p></div></div>
      {issues.slice(1).map((issue) => <div key={issue.title} className="mt-2 border-t border-black/5 pt-2 text-[10px]"><strong>{issue.title}</strong><span className="ml-1 text-[var(--dialed-text-secondary)]">{issue.detail}</span></div>)}
    </section>

    {sourceRecommendation && (sourceRecommendation.status === "active" || sourceRecommendation.status === "applied") && <NextShotCard recommendation={sourceRecommendation} beanName={shot.beans?.name} sourceShotId={shot.id} />}
    {appliedRecommendation && <RecommendationHistory recommendation={appliedRecommendation} />}

    <section className="mt-3 rounded-[24px] border bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-2 flex items-start justify-between gap-3"><div><h2 className="text-sm font-extrabold">Vergleich</h2><p className="mt-1 text-[10px] leading-4 text-[var(--dialed-text-muted)]">Dieser Shot gegen ähnliche Extraktionen.</p></div><span className="rounded-full bg-[var(--dialed-sage-soft)] px-2 py-1 text-[9px] font-bold text-[var(--dialed-sage)]">Zeit × Ratio</span></div>
      <ShotComparisonChart shot={shot} shots={shots} />
      <div className="mt-2 flex items-center justify-between text-[9px] text-[var(--dialed-text-muted)]"><span><i className="mr-1 inline-block size-2 rounded-full bg-[var(--dialed-espresso)]" />Dieser Shot</span><span>{shot.target_recipe_snapshot ? "Persönliches Ziel grün" : "Noch kein Zielrezept"}</span></div>
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
  if (shot.score_coverage !== null && shot.score_coverage < 40) issues.push({ title: "Geringe Aussagekraft", detail: "Für einen belastbareren Vergleich fehlen noch Kerndaten." });
  if (shot.flow === "channeling") issues.push({ title: "Starkes Channeling", detail: "WDT und Verteilung zuerst stabilisieren; das restliche Rezept unverändert lassen." });
  if (shot.flow === "minor_channeling") issues.push({ title: "Leichtes Channeling", detail: "Beobachte, ob sich das Extraktionsbild bei den nächsten Shots wiederholt." });
  if (shot.taste === "sour" || shot.taste === "bitter") issues.push({ title: "Geschmack nicht ausgewogen", detail: tasteLabel(shot.taste) });
  if (!shot.taste && shot.overall_taste_rating === null) issues.push({ title: "Geschmack fehlt", detail: "Für einen vollständigen Score fehlt noch eine kurze Geschmacksbewertung." });
  return issues.slice(0, 3);
}

function extractionPictureLabel(flow: ShotWithBean["flow"]) {
  return flow ? ({ even: "Gleichmäßig", minor_channeling: "Leichtes Channeling", channeling: "Starkes Channeling" })[flow] : "Nicht angegeben";
}

function puckLabel(puck: ShotWithBean["puck"]) {
  return puck ? ({ dry: "Trocken", ideal: "Normal", wet: "Nass", stuck: "Festhängend" })[puck] : "Nicht angegeben";
}
