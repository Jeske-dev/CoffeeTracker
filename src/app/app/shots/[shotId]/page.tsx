import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, AlertTriangle, ArrowLeft, Bean, CheckCircle2, Coffee, Droplets, FlaskConical, Gauge, Pencil, Scale, Sparkles, Target, Thermometer, Timer, type LucideIcon } from "lucide-react";
import { requireUser } from "@/lib/supabase/auth";
import { loadAppData } from "@/features/data/queries";
import { brewRatio, postStopDrip, TASTE_COLORS } from "@/lib/calculations";
import { formatDateTime, formatRatio, formatTime, formatWeight, tasteLabel } from "@/lib/formatting";
import { DeleteShotButton } from "@/components/shots/delete-shot-button";
import { ShotComparisonChart } from "@/components/shots/shot-comparison-chart";
import type { ShotWithBean } from "@/types/domain";

export default async function ShotDetail({ params }: PageProps<"/app/shots/[shotId]">) {
  const { shotId } = await params;
  const { userId } = await requireUser();
  const { shots, equipment } = await loadAppData(userId);
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) notFound();

  const ratio = brewRatio(shot.final_yield_grams, shot.dose_grams);
  const drip = postStopDrip(shot.final_yield_grams, shot.stop_weight_grams);
  const provisional = shot.score_coverage !== null && shot.score_coverage < 70;
  const issues = shotIssues(shot);
  const metrics: Metric[] = [
    { label: "Dosis", value: formatWeight(shot.dose_grams), icon: Scale, tone: shot.dose_grams === null ? "muted" : "default" },
    { label: "Yield", value: formatWeight(shot.final_yield_grams), icon: Droplets, tone: ratio !== null && (ratio < 1.8 || ratio > 2.15) ? "warning" : "default" },
    { label: "Ratio", value: formatRatio(ratio), icon: Target, tone: ratio !== null && (ratio < 1.8 || ratio > 2.15) ? "warning" : "default" },
    { label: "Zeit", value: formatTime(shot.extraction_seconds), icon: Timer, tone: shot.extraction_seconds !== null && (shot.extraction_seconds < 25 || shot.extraction_seconds > 32) ? "warning" : "default" },
    { label: "Stop", value: formatWeight(shot.stop_weight_grams), icon: Gauge, tone: "default" },
    { label: "Nachlauf", value: formatWeight(drip), icon: Activity, tone: drip !== null && drip > 3 ? "warning" : "default" },
  ];
  const equip = (id: string | null) => equipment.find((e) => e.id === id)?.name ?? "Nicht angegeben";

  return <div className="pb-4">
    <header className="mb-5 flex items-center gap-3"><Link href="/app/shots" aria-label="Zurück" className="grid size-10 place-items-center rounded-full bg-[var(--dialed-surface-subtle)]"><ArrowLeft className="size-4" /></Link><div className="min-w-0"><p className="text-[10px] uppercase tracking-[.12em] text-[var(--dialed-text-muted)]">{formatDateTime(shot.shot_at)}</p><h1 className="font-display truncate text-[30px] font-medium">{shot.beans?.name ?? "Shot"}</h1></div></header>

    <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,var(--dialed-espresso),var(--dialed-espresso-raised))] p-5 text-white shadow-[var(--shadow-md)]">
      <div className="absolute right-4 top-5 grid size-20 place-items-center rounded-full bg-white/8"><Coffee className="size-8 text-white/45" /></div>
      <div className="relative z-10 flex items-end justify-between gap-5">
        <div><span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/75"><Sparkles className="size-3" />Dialed Score</span><strong className="mt-3 block font-display text-[58px] font-medium leading-none">{shot.score ?? "—"}</strong><p className="mt-2 text-xs text-white/62">{tasteLabel(shot.taste)} · {shot.score_coverage === null ? "Keine Abdeckung" : `${Math.round(shot.score_coverage)}% Datenabdeckung`}</p></div>
        <div className="pb-1 text-right"><span className="block text-[10px] text-white/55">Brew Ratio</span><strong className="font-mono text-lg">{formatRatio(ratio)}</strong>{provisional && <span className="mt-2 block rounded-full bg-amber-200/20 px-2 py-1 text-[10px] text-amber-100">Vorläufig</span>}</div>
      </div>
    </section>

    <section className={`mt-3 rounded-[22px] border p-4 ${issues.length ? "border-[var(--dialed-rose)]/20 bg-[var(--dialed-rose-soft)]/55" : "border-[var(--dialed-sage)]/20 bg-[var(--dialed-sage-soft)]/65"}`}>
      <div className="mb-3 flex items-center gap-2">{issues.length ? <AlertTriangle className="size-4 text-[var(--dialed-rose)]" /> : <CheckCircle2 className="size-4 text-[var(--dialed-sage)]" />}<h2 className="text-sm font-extrabold">{issues.length ? "Auffälligkeiten" : "Keine klaren Probleme"}</h2></div>
      <div className="grid gap-2">{(issues.length ? issues : [{ title: "Im Zielbereich", detail: "Zeit, Ratio und Diagnose wirken für diesen Shot stabil.", icon: CheckCircle2 }]).map((issue) => <ProblemItem key={issue.title} {...issue} />)}</div>
    </section>

    <div className="mt-3 grid grid-cols-2 gap-2">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>

    <section className="mt-3 rounded-[24px] border bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-2 flex items-start justify-between gap-3"><div><h2 className="text-sm font-extrabold">Vergleich</h2><p className="mt-1 text-[10px] leading-4 text-[var(--dialed-text-muted)]">Dieser Shot gegen ähnliche Extraktionen.</p></div><span className="rounded-full bg-[var(--dialed-sage-soft)] px-2 py-1 text-[9px] font-bold text-[var(--dialed-sage)]">Zeit × Ratio</span></div>
      <ShotComparisonChart shot={shot} shots={shots} />
      <div className="mt-2 flex items-center justify-between text-[9px] text-[var(--dialed-text-muted)]"><span><i className="mr-1 inline-block size-2 rounded-full bg-[var(--dialed-espresso)]" />Dieser Shot</span><span>Zielbereich grün</span></div>
    </section>

    <section className="mt-3 rounded-[24px] border bg-white p-4">
      <h2 className="mb-3 text-sm font-extrabold">Rezept & Diagnose</h2>
      <div className="grid gap-2">
        <InfoRow icon={Bean} label="Bohne" value={shot.beans ? `${shot.beans.name} · ${shot.beans.roaster}` : "Nicht angegeben"} />
        <InfoRow icon={Coffee} label="Maschine" value={equip(shot.machine_id)} />
        <InfoRow icon={Gauge} label="Mühle" value={`${equip(shot.grinder_id)} · Mahlgrad ${shot.grind_setting ?? "—"}`} />
        <InfoRow icon={Thermometer} label="Temperatur" value={shot.temperature_c !== null ? `${shot.temperature_c} °C` : "Nicht angegeben"} />
        <InfoRow icon={FlaskConical} label="Tools" value={shot.prep_tools?.join(", ") || "Nicht angegeben"} />
        <InfoRow icon={Droplets} label="Flow & Puck" value={`${flowLabel(shot.flow)} · ${puckLabel(shot.puck)}`} />
      </div>
      {shot.notes && <p className="mt-4 rounded-[18px] bg-[var(--dialed-surface-subtle)] p-3 text-xs leading-5 text-[var(--dialed-text-secondary)]">{shot.notes}</p>}
      <span className="mt-4 inline-flex items-center gap-2 text-xs"><i className="size-2 rounded-full" style={{ background: shot.taste ? TASTE_COLORS[shot.taste] : "#b8ada6" }} />{tasteLabel(shot.taste)}</span>
    </section>

    <div className="mt-5 flex gap-2"><Link href={`/app/shots/${shot.id}/edit`} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--dialed-espresso)] px-4 text-sm font-medium text-white"><Pencil className="size-4" />Bearbeiten</Link><DeleteShotButton id={shot.id} /></div>
  </div>;
}

type Metric = { label: string; value: string; icon: LucideIcon; tone: "default" | "warning" | "muted" };
type Issue = { title: string; detail: string; icon: LucideIcon };

function MetricCard({ label, value, icon: Icon, tone }: Metric) { return <article className={`min-w-0 rounded-[18px] border bg-white p-3.5 ${tone === "warning" ? "border-[var(--dialed-rose)]/25 shadow-[0_8px_18px_rgba(169,95,82,.08)]" : ""}`}><div className="mb-3 flex items-center justify-between"><span className={`grid size-8 place-items-center rounded-[12px] ${tone === "warning" ? "bg-[var(--dialed-rose-soft)] text-[var(--dialed-rose)]" : "bg-[var(--dialed-surface-subtle)] text-[var(--dialed-crema)]"}`}><Icon className="size-4" /></span>{tone === "warning" && <AlertTriangle className="size-3.5 text-[var(--dialed-rose)]" />}</div><small className="block text-[9px] uppercase tracking-wider text-[var(--dialed-text-muted)]">{label}</small><strong className="mt-1 block truncate text-sm">{value}</strong></article>; }
function ProblemItem({ title, detail, icon: Icon }: Issue) { return <div className="grid grid-cols-[34px_1fr] gap-3 rounded-[16px] bg-white/72 p-3"><span className="grid size-[34px] place-items-center rounded-[12px] bg-white text-[var(--dialed-rose)]"><Icon className="size-4" /></span><span><strong className="block text-xs">{title}</strong><small className="mt-1 block text-[10px] leading-4 text-[var(--dialed-text-secondary)]">{detail}</small></span></div>; }
function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="grid min-h-12 grid-cols-[36px_1fr] items-center gap-3 rounded-[16px] bg-[var(--dialed-surface-subtle)] px-3 py-2"><span className="grid size-9 place-items-center rounded-[12px] bg-white text-[var(--dialed-crema)]"><Icon className="size-4" /></span><span className="min-w-0"><small className="block text-[9px] text-[var(--dialed-text-muted)]">{label}</small><strong className="block truncate text-xs">{value}</strong></span></div>; }

function shotIssues(shot: ShotWithBean): Issue[] {
  const ratio = brewRatio(shot.final_yield_grams, shot.dose_grams);
  const drip = postStopDrip(shot.final_yield_grams, shot.stop_weight_grams);
  const issues: Issue[] = [];
  if (shot.score_coverage !== null && shot.score_coverage < 40) issues.push({ title: "Zu wenig Daten", detail: "Der Score hat eine geringe Aussagekraft.", icon: AlertTriangle });
  if (shot.extraction_seconds !== null && shot.extraction_seconds < 25) issues.push({ title: "Läuft schnell", detail: `${formatTime(shot.extraction_seconds)} liegt unter dem Sweet-Spot.`, icon: Timer });
  if (shot.extraction_seconds !== null && shot.extraction_seconds > 32) issues.push({ title: "Läuft langsam", detail: `${formatTime(shot.extraction_seconds)} liegt über dem Sweet-Spot.`, icon: Timer });
  if (ratio !== null && ratio < 1.8) issues.push({ title: "Kurzer Ratio", detail: `${formatRatio(ratio)} ist unter dem Zielbereich.`, icon: Target });
  if (ratio !== null && ratio > 2.15) issues.push({ title: "Langer Ratio", detail: `${formatRatio(ratio)} ist über dem Zielbereich.`, icon: Target });
  if (shot.flow === "minor_channeling" || shot.flow === "channeling" || shot.flow === "spritzing" || shot.channeling) issues.push({ title: "Channeling sichtbar", detail: "Verteilung, WDT und Tampen zuerst prüfen.", icon: Activity });
  if (drip !== null && drip > 3) issues.push({ title: "Hoher Nachlauf", detail: `${formatWeight(drip)} nach Pumpenstopp kann den Yield verschieben.`, icon: Droplets });
  if (shot.puck === "wet" || shot.puck === "stuck" || shot.puck === "dry") issues.push({ title: "Puck auffällig", detail: puckLabel(shot.puck), icon: Gauge });
  if (shot.taste === "sour" || shot.taste === "very_sour" || shot.taste === "bitter" || shot.taste === "very_bitter") issues.push({ title: "Geschmack nicht balanciert", detail: tasteLabel(shot.taste), icon: Sparkles });
  return issues.slice(0, 5);
}

function flowLabel(flow: ShotWithBean["flow"]) { return flow ? ({ even: "Gleichmäßig", minor_channeling: "Leichtes Channeling", channeling: "Starkes Channeling", spritzing: "Spritzing" })[flow] : "Flow nicht angegeben"; }
function puckLabel(puck: ShotWithBean["puck"]) { return puck ? ({ dry: "Zu trocken", ideal: "Sauber & stabil", wet: "Sehr nass", stuck: "Hängengeblieben" })[puck] : "Puck nicht angegeben"; }
