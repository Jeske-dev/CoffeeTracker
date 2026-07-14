import { Suspense } from "react";
import Link from "next/link";
import { BarChart3, Plus } from "lucide-react";
import { requireUser } from "@/lib/supabase/auth";
import { loadDashboardData } from "@/features/data/queries";
import { brewRatio, isSweetSpot, loggingStreak } from "@/lib/calculations";
import { formatRatio, formatTime } from "@/lib/formatting";
import { ShotCard } from "@/components/shots/shot-card";
import { SweetSpotChart } from "@/components/dashboard/sweet-spot-chart";
import { UserMenu } from "@/components/app-shell/user-menu";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";
import { NextShotCard } from "@/features/recommendations/components/next-shot-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PrivateCacheSeed } from "@/components/providers/private-cache-seed";
import { privateCacheKeys } from "@/lib/cache/keys";

type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>;

export default async function Dashboard() {
  const { supabase, userId, email } = await requireUser();
  const data = loadDashboardData(userId, supabase);
  return <div>
    <Suspense fallback={null}><DashboardCacheFallback data={data} userId={userId} /></Suspense>
    <Suspense fallback={<HeaderSkeleton />}><DashboardHeader data={data} email={email} /></Suspense>
    <Suspense fallback={<QuickStartSkeleton />}><QuickStart data={data} /></Suspense>
    <Suspense fallback={<ChartSkeleton />}><DashboardChart data={data} /></Suspense>
    <Suspense fallback={<StatsSkeleton />}><DashboardStats data={data} /></Suspense>
    <Suspense fallback={null}><PersonalAnalytics data={data} /></Suspense>
    <Suspense fallback={<RecentShotsSkeleton />}><RecentShots data={data} /></Suspense>
  </div>;
}

async function DashboardCacheFallback({ data, userId }: { data: Promise<DashboardData>; userId: string }) {
  const resolved = await data;
  const dashboard = {
    profile: resolved.profile,
    settings: resolved.settings,
    beans: resolved.beans,
    shots: resolved.shots,
    activeRecommendation: resolved.activeRecommendation,
    completedRecommendations: resolved.completedRecommendations,
  };
  return <PrivateCacheSeed entries={[
    { key: privateCacheKeys.dashboard(userId), data: dashboard },
    { key: privateCacheKeys.shots(userId), data: { shots: resolved.shots, beans: resolved.beans } },
    { key: privateCacheKeys.profile(userId), data: resolved.profile },
    { key: privateCacheKeys.settings(userId), data: resolved.settings },
    { key: privateCacheKeys.activeRecommendation(userId), data: resolved.activeRecommendation },
    { key: privateCacheKeys.analytics(userId), data: resolved.completedRecommendations },
  ]} />;
}

async function DashboardHeader({ data, email }: { data: Promise<DashboardData>; email: string }) {
  const { profile } = await data;
  const now = new Date();
  const greeting = now.getHours() < 11 ? "Guten Morgen" : now.getHours() < 18 ? "Guten Tag" : "Guten Abend";
  const displayName = profile?.display_name || email;
  const registeredLabel = profile?.created_at ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(profile.created_at)) : "Nicht verfügbar";
  return <header className="mx-0.5 mb-[22px] flex items-center justify-between"><div><p className="mb-1 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--dialed-text-muted)]">{new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(now).replace(",", " ·")}</p><h1 className="font-display text-[30px] font-medium">{greeting}</h1></div><UserMenu displayName={displayName} email={email} registeredLabel={registeredLabel} /></header>;
}

async function QuickStart({ data }: { data: Promise<DashboardData> }) {
  const { activeRecommendation, beans, settings, shots } = await data;
  const last = shots[0];
  const lastBean = beans.find((bean) => bean.id === (settings?.last_bean_id ?? last?.bean_id)) ?? beans.find((bean) => !bean.archived_at);
  return <>
    <article className="relative min-h-[250px] overflow-hidden rounded-[30px] bg-[linear-gradient(145deg,var(--dialed-espresso),var(--dialed-espresso-raised))] p-6 pb-[88px] text-white shadow-[var(--shadow-md)]"><div className="bean-visual !right-6 !top-12" aria-hidden /><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-white/60"><EntityIconFrame className="bg-white/10 text-white"><BeanIcon origin={lastBean?.origin} /></EntityIconFrame>Nächster Shot</p><h2 className="font-display mt-2 max-w-[185px] break-words text-[29px] font-medium leading-tight">{lastBean?.name ?? "Deine erste Bohne"}</h2><p className="mt-1 max-w-[190px] break-words text-[13px] leading-5 text-white/60">{last ? `${last.dose_grams !== null ? `${last.dose_grams.toLocaleString("de-DE")} g` : "Dosis —"} · Mahlgrad ${last.grind_setting ?? "—"} · zuletzt ${last.score ?? "—"} Punkte` : lastBean ? `${lastBean.roaster} · bereit für den ersten Shot` : "Füge zuerst eine Bohne hinzu"}</p><div className="absolute inset-x-6 bottom-5 z-10"><Link href={lastBean ? "/app/shots/new" : "/app/beans/new"} prefetch className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-[18px] text-[13px] font-extrabold text-[var(--dialed-text)] shadow-lg"><Plus className="size-4" />{lastBean ? "Shot starten" : "Bohne hinzufügen"}</Link></div></article>
    {activeRecommendation && <NextShotCard recommendation={activeRecommendation} beanName={beans.find((bean) => bean.id === activeRecommendation.bean_id)?.name} sourceShotId={activeRecommendation.source_shot_id} />}
  </>;
}

async function DashboardChart({ data }: { data: Promise<DashboardData> }) {
  const { shots } = await data;
  const recent30 = completeRecentShots(shots);
  const inZone = recent30.filter((shot) => isSweetSpot(shot.extraction_seconds, brewRatio(shot.final_yield_grams, shot.dose_grams))).length;
  const percent = recent30.length ? Math.round((inZone / recent30.length) * 100) : 0;
  return <><SectionHead title="Dein Sweet Spot" link="Letzte 30 Tage" /><article className="rounded-[24px] border bg-white px-4 pt-4 pb-3.5 shadow-[var(--shadow-sm)]"><div className="flex justify-between"><div><strong className="font-display text-[25px] font-medium">{percent}%</strong><small className="block text-[10px] text-[var(--dialed-text-muted)]">Shots im Zielbereich</small></div>{recent30.length > 1 && <span className="h-fit rounded-full bg-[var(--dialed-sage-soft)] px-2 py-1.5 text-[10px] font-extrabold text-[var(--dialed-sage)]">↗ {inZone} im Ziel</span>}</div><SweetSpotChart shots={recent30.slice(0, 20)} /><div className="flex justify-between text-[9px] text-[var(--dialed-text-muted)]"><span>● Shot / Farbe = Geschmack</span><span>◌ Zielbereich</span></div></article></>;
}

async function DashboardStats({ data }: { data: Promise<DashboardData> }) {
  const { shots } = await data;
  const recent30 = completeRecentShots(shots);
  const avgRatio = recent30.length ? recent30.reduce((sum, shot) => sum + (brewRatio(shot.final_yield_grams, shot.dose_grams) ?? 0), 0) / recent30.length : 0;
  const avgTime = recent30.length ? recent30.reduce((sum, shot) => sum + (shot.extraction_seconds ?? 0), 0) / recent30.length : 0;
  return <div className="mt-2.5 grid grid-cols-3 gap-2">{[["Ø Brew Ratio", avgRatio ? formatRatio(avgRatio) : "—"], ["Ø Zeit", avgTime ? formatTime(avgTime) : "—"], ["Serie", `${loggingStreak(shots)} ${loggingStreak(shots) === 1 ? "Shot" : "Shots"}`]].map(([label, value], index) => <article key={label} className="min-w-0 rounded-[18px] bg-[var(--dialed-surface-subtle)] px-3 py-[13px]"><small className="block whitespace-nowrap text-[9px] text-[var(--dialed-text-muted)]">{label}</small><strong className="mt-1.5 block whitespace-nowrap text-[15px]">{value}</strong><div className="mt-2 h-[3px] overflow-hidden rounded-full bg-black/5"><span className="block h-full rounded-full bg-[var(--dialed-crema)]" style={{ width: `${[78, 68, 88][index]}%` }} /></div></article>)}</div>;
}

async function PersonalAnalytics({ data }: { data: Promise<DashboardData> }) {
  const { completedRecommendations, shots } = await data;
  const actionLabels: Record<string, string> = { GRIND_FINER: "Feiner mahlen", GRIND_COARSER: "Gröber mahlen", INCREASE_YIELD: "Yield erhöhen", DECREASE_YIELD: "Yield reduzieren", USE_WDT: "WDT", IMPROVE_WDT: "WDT verbessern", INCREASE_DOSE: "Dosis erhöhen", DECREASE_DOSE: "Dosis reduzieren", KEEP_RECIPE: "Rezept beibehalten" };
  const successfulByAction = completedRecommendations.reduce<Record<string, number[]>>((groups, item) => { const action = (item.primary_action as { actionType?: string }).actionType; const successful = (item.outcome as { status?: string } | null)?.status === "successful"; if (action) { groups[action] ??= []; groups[action].push(successful ? 1 : 0); } return groups; }, {});
  const insights = Object.entries(successfulByAction).filter(([, results]) => results.length >= 3 && results.reduce((sum, value) => sum + value, 0) / results.length >= .6).map(([action, results]) => `${actionLabels[action] ?? action} half bei ${results.reduce((sum, value) => sum + value, 0)} von ${results.length} auswertbaren Versuchen.`).slice(0, 2);
  const last = shots[0];
  const overshoots = shots.filter((item) => item.machine_id === last?.machine_id && item.final_yield_grams !== null && item.stop_weight_grams !== null).slice(0, 10).map((item) => (item.final_yield_grams as number) - (item.stop_weight_grams as number)).sort((a, b) => a - b);
  if (overshoots.length >= 3) { const middle = Math.floor(overshoots.length / 2); const median = overshoots.length % 2 ? overshoots[middle] : (overshoots[middle - 1] + overshoots[middle]) / 2; insights.push(`Deine Maschine läuft im Median ${median.toLocaleString("de-DE", { maximumFractionDigits: 1 })} g nach.`); }
  if (!insights.length) return null;
  return <><SectionHead title="Was bei dir funktioniert" /><section className="grid gap-2">{insights.slice(0, 3).map((insight) => <div key={insight} className="grid grid-cols-[36px_1fr] items-center gap-3 rounded-[16px] bg-[var(--dialed-sage-soft)]/65 p-3"><span className="grid size-9 place-items-center rounded-[11px] bg-white text-[var(--dialed-sage)]"><BarChart3 className="size-4" /></span><p className="text-[11px] leading-4 text-[var(--dialed-text-secondary)]">{insight}</p></div>)}</section></>;
}

async function RecentShots({ data }: { data: Promise<DashboardData> }) {
  const { shots } = await data;
  return <><div className="mt-7 mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Letzte Extraktionen</h2><Link href="/app/shots" prefetch className="text-xs font-bold text-[var(--dialed-crema)]">Alle ansehen</Link></div><div className="grid gap-2.5">{shots.length ? shots.slice(0, 4).map((shot) => <ShotCard key={shot.id} shot={shot} />) : <div className="rounded-[24px] border border-dashed p-8 text-center"><strong className="font-display text-xl font-medium">Noch kein Shot</strong><p className="mt-2 text-xs leading-5 text-[var(--dialed-text-muted)]">Starte deinen ersten Bezug und baue deine persönliche Dial-in-Historie auf.</p></div>}</div></>;
}

function completeRecentShots(shots: DashboardData["shots"]) { return shots.filter((shot) => +new Date(shot.shot_at) > Date.now() - 30 * 86400000 && shot.extraction_seconds !== null && shot.dose_grams !== null && shot.final_yield_grams !== null); }
function SectionHead({ title, link }: { title: string; link?: string }) { return <div className="mt-7 mb-3 flex items-center justify-between"><h2 className="text-base font-bold">{title}</h2>{link && <span className="text-[11px] text-[var(--dialed-text-muted)]">{link}</span>}</div>; }
function HeaderSkeleton() { return <div className="mb-[22px] flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-3 w-40" /><Skeleton className="h-9 w-44" /></div><Skeleton className="size-[42px] rounded-full" /></div>; }
function QuickStartSkeleton() { return <Skeleton className="h-[250px] rounded-[30px]" />; }
function ChartSkeleton() { return <div className="mt-7 space-y-3"><Skeleton className="h-5 w-36" /><Skeleton className="h-[244px] rounded-[24px]" /></div>; }
function StatsSkeleton() { return <div className="mt-2.5 grid grid-cols-3 gap-2">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-20 rounded-[18px]" />)}</div>; }
function RecentShotsSkeleton() { return <div className="mt-7 space-y-3"><Skeleton className="h-5 w-40" />{[0, 1, 2].map((item) => <Skeleton key={item} className="h-[76px] rounded-[18px]" />)}</div>; }
