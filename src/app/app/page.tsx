import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/supabase/auth";
import { loadDashboardData } from "@/features/data/queries";
import { formatTime, formatWeight } from "@/lib/formatting";
import { ShotCard } from "@/components/shots/shot-card";
import { GrindTimeChart } from "@/components/dashboard/grind-time-chart";
import { NextShotTargets } from "@/components/dashboard/next-shot-targets";
import { UserMenu } from "@/components/app-shell/user-menu";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";
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
    <Suspense fallback={<TargetsSkeleton />}><DashboardTargets data={data} /></Suspense>
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
  };
  return <PrivateCacheSeed entries={[
    { key: privateCacheKeys.dashboard(userId), data: dashboard },
    { key: privateCacheKeys.shots(userId), data: { shots: resolved.shots, beans: resolved.beans } },
    { key: privateCacheKeys.profile(userId), data: resolved.profile },
    { key: privateCacheKeys.settings(userId), data: resolved.settings },
    { key: privateCacheKeys.activeRecommendation(userId), data: resolved.activeRecommendation },
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
  const { beans, settings, shots } = await data;
  const last = shots[0];
  const lastBean = beans.find((bean) => bean.id === (settings?.last_bean_id ?? last?.bean_id)) ?? beans.find((bean) => !bean.archived_at);
  return <article className="relative min-h-[250px] overflow-hidden rounded-[30px] bg-[linear-gradient(145deg,var(--dialed-espresso),var(--dialed-espresso-raised))] p-6 pb-[88px] text-white shadow-[var(--shadow-md)]"><div className="bean-visual !right-6 !top-12" aria-hidden /><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-white/60"><EntityIconFrame className="bg-white/10 text-white"><BeanIcon origin={lastBean?.origin} /></EntityIconFrame>Nächster Shot</p><h2 className="font-display mt-2 max-w-[185px] break-words text-[29px] font-medium leading-tight">{lastBean?.name ?? "Deine erste Bohne"}</h2><p className="mt-1 max-w-[205px] break-words text-[13px] leading-5 text-white/60">{last ? `${formatWeight(last.dose_grams)} · Mahlgrad ${last.grind_setting ?? "—"} · zuletzt ${formatTime(last.extraction_seconds)}` : lastBean ? `${lastBean.roaster} · bereit für den ersten Shot` : "Füge zuerst eine Bohne hinzu"}</p><div className="absolute inset-x-6 bottom-5 z-10"><Link href={lastBean ? "/app/shots/new" : "/app/beans/new"} prefetch className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-[18px] text-[13px] font-extrabold text-[var(--dialed-text)] shadow-lg"><Plus className="size-4" />{lastBean ? "Shot starten" : "Bohne hinzufügen"}</Link></div></article>;
}

async function DashboardChart({ data }: { data: Promise<DashboardData> }) {
  const { shots } = await data;
  return <><SectionHead title="Mahlgrad & Extraktionszeit" link="Letzte vergleichbare Shots" /><article className="rounded-[24px] border bg-white px-4 pt-3 pb-3 shadow-[var(--shadow-sm)]"><GrindTimeChart shots={shots} /><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--dialed-text-muted)]"><span>Horizontal: Mahlgrad</span><span>Vertikal: Sekunden</span></div></article></>;
}

async function DashboardTargets({ data }: { data: Promise<DashboardData> }) {
  const { activeRecommendation, settings, shots } = await data;
  const recommendation = settings?.dial_in_suggestions_enabled === false ? null : activeRecommendation;
  return <NextShotTargets recommendation={recommendation} latestShot={shots[0] ?? null} />;
}

async function RecentShots({ data }: { data: Promise<DashboardData> }) {
  const { shots } = await data;
  return <><div className="mt-7 mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Letzte Extraktionen</h2><Link href="/app/shots" prefetch className="text-xs font-bold text-[var(--dialed-crema)]">Alle ansehen</Link></div><div className="grid gap-2.5">{shots.length ? shots.slice(0, 4).map((shot) => <ShotCard key={shot.id} shot={shot} />) : <div className="rounded-[24px] border border-dashed p-8 text-center"><strong className="font-display text-xl font-medium">Noch kein Shot</strong><p className="mt-2 text-xs leading-5 text-[var(--dialed-text-muted)]">Starte deinen ersten Bezug und baue deine persönliche Dial-in-Historie auf.</p></div>}</div></>;
}

function SectionHead({ title, link }: { title: string; link?: string }) { return <div className="mt-7 mb-3 flex items-center justify-between"><h2 className="text-base font-bold">{title}</h2>{link && <span className="text-[11px] text-[var(--dialed-text-muted)]">{link}</span>}</div>; }
function HeaderSkeleton() { return <div className="mb-[22px] flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-3 w-40" /><Skeleton className="h-9 w-44" /></div><Skeleton className="size-[42px] rounded-full" /></div>; }
function QuickStartSkeleton() { return <Skeleton className="h-[250px] rounded-[30px]" />; }
function ChartSkeleton() { return <div className="mt-7 space-y-3"><Skeleton className="h-5 w-36" /><Skeleton className="h-[244px] rounded-[24px]" /></div>; }
function TargetsSkeleton() { return <div className="mt-2.5 grid grid-cols-3 gap-2">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-[76px] rounded-[16px]" />)}</div>; }
function RecentShotsSkeleton() { return <div className="mt-7 space-y-3"><Skeleton className="h-5 w-40" />{[0, 1, 2].map((item) => <Skeleton key={item} className="h-[210px] rounded-[18px] sm:h-[164px]" />)}</div>; }
