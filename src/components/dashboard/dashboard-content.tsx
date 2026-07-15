import type { ReactNode } from "react";
import Link from "next/link";
import { ChartNoAxesColumnIncreasing, Plus } from "lucide-react";
import { UserMenu } from "@/components/app-shell/user-menu";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";
import { PrivateCacheSeed } from "@/components/providers/private-cache-seed";
import { ShotCard } from "@/components/shots/shot-card";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { loadDashboardData } from "@/features/data/queries";
import { buildTimeRatioSeries } from "@/features/shots/time-ratio-series";
import { privateCacheKeys } from "@/lib/cache/keys";
import { formatTime, formatWeight } from "@/lib/formatting";
import { NextShotTargets } from "./next-shot-targets";
import { SweetSpotChart } from "./sweet-spot-chart";

type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>;

const dashboardDateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Berlin",
});
const registrationDateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Berlin",
});
const berlinHourFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Berlin",
});

export async function DashboardContent({
  data,
  userId,
  email,
}: {
  data: Promise<DashboardData>;
  userId: string;
  email: string;
}) {
  const dashboard = await data;

  return <div>
    <DashboardCacheSeed data={dashboard} userId={userId} />
    <DashboardHeader data={dashboard} email={email} />
    {dashboard.error && <DashboardError />}
    <QuickStart data={dashboard} />
    <DashboardChart data={dashboard} />
    <DashboardTargets data={dashboard} />
    <RecentShots shots={dashboard.shots} />
  </div>;
}

function DashboardCacheSeed({ data, userId }: { data: DashboardData; userId: string }) {
  const dashboard = {
    profile: data.profile,
    settings: data.settings,
    beans: data.beans,
    shots: data.shots,
    activeRecommendation: data.activeRecommendation,
  };

  return <PrivateCacheSeed entries={[
    { key: privateCacheKeys.dashboard(userId), data: dashboard },
    { key: privateCacheKeys.shots(userId), data: { shots: data.shots, beans: data.beans } },
    { key: privateCacheKeys.profile(userId), data: data.profile },
    { key: privateCacheKeys.settings(userId), data: data.settings },
    { key: privateCacheKeys.activeRecommendation(userId), data: data.activeRecommendation },
  ]} />;
}

function DashboardHeader({ data, email }: { data: DashboardData; email: string }) {
  const now = new Date();
  const hour = Number(berlinHourFormatter.format(now));
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const displayName = data.profile?.display_name || email;
  const registeredLabel = data.profile?.created_at
    ? registrationDateFormatter.format(new Date(data.profile.created_at))
    : "Nicht verfügbar";

  return <header className="mb-8 flex items-center justify-between border-b border-black pb-5">
    <div>
      <p className="mb-2 text-[11px] font-semibold tracking-[.1em] text-[var(--dialed-text-muted)] uppercase">
        {dashboardDateFormatter.format(now).replace(",", " ·")}
      </p>
      <h1 className="font-display text-[32px] font-bold leading-[1.1]">{greeting}</h1>
    </div>
    <UserMenu displayName={displayName} email={email} registeredLabel={registeredLabel} />
  </header>;
}

function DashboardError() {
  return <div role="alert" className="mb-4 border border-[var(--crema-error)] bg-[var(--dialed-rose-soft)] px-4 py-3 text-xs text-[var(--dialed-rose)]">
    Einige Daten konnten nicht aktualisiert werden. Bereits geladene Inhalte bleiben verfügbar.
  </div>;
}

function QuickStart({ data }: { data: DashboardData }) {
  const lastShot = data.shots[0];
  const lastBean = data.beans.find((bean) => bean.id === (data.settings?.last_bean_id ?? lastShot?.bean_id))
    ?? data.beans.find((bean) => !bean.archived_at);
  const destination = lastBean ? "/app/shots/new" : "/app/beans/new";

  return <article className="relative min-h-[250px] overflow-hidden border border-black bg-black p-6 pb-[88px] text-white">
    <div className="bean-visual !right-8 !top-12 max-[360px]:hidden" aria-hidden />
    <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[.1em] text-white/70 uppercase">
      <EntityIconFrame className="border-white/40 bg-transparent text-white"><BeanIcon origin={lastBean?.origin} /></EntityIconFrame>
      Nächster Shot
    </p>
    <h2 className="mt-5 max-w-[205px] break-words font-display text-[30px] font-semibold leading-[1.15]">
      {lastBean?.name ?? "Deine erste Bohne"}
    </h2>
    <p className="mt-2 max-w-[205px] break-words text-[13px] leading-5 text-white/65">
      {quickStartSummary(lastShot, lastBean)}
    </p>
    <div className="absolute inset-x-6 bottom-5 z-10">
      <Link href={destination} prefetch className="inline-flex min-h-11 items-center gap-2 border border-white bg-white px-5 text-[11px] font-semibold tracking-[.1em] text-black uppercase hover:bg-black hover:text-white">
        <Plus className="size-4" />
        {lastBean ? "Shot starten" : "Bohne hinzufügen"}
      </Link>
    </div>
  </article>;
}

function DashboardChart({ data }: { data: DashboardData }) {
  const series = buildTimeRatioSeries(data.shots);

  return <SectionCard
    title="Zeit × Ratio"
    description="Letzte zehn vollständige Shots"
    icon={ChartNoAxesColumnIncreasing}
    tone="crema"
    className="mt-7"
  >
    <SweetSpotChart series={series} />
    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[10px] font-semibold tracking-[.08em] text-[var(--dialed-text-muted)] uppercase">
      <span>Horizontal: Zeit</span>
      <span>Vertikal: Ratio</span>
    </div>
  </SectionCard>;
}

function DashboardTargets({ data }: { data: DashboardData }) {
  const recommendation = data.settings?.dial_in_suggestions_enabled === false ? null : data.activeRecommendation;
  return <NextShotTargets recommendation={recommendation} latestShot={data.shots[0] ?? null} />;
}

function RecentShots({ shots }: { shots: DashboardData["shots"] }) {
  return <>
    <SectionHeading
      title="Letzte Extraktionen"
      action={<Link href="/app/shots" prefetch className="text-[10px] font-semibold tracking-[.1em] text-black uppercase underline underline-offset-4">Alle ansehen</Link>}
    />
    <div className="grid gap-2.5">
      {shots.length
        ? shots.slice(0, 4).map((shot) => <ShotCard key={shot.id} shot={shot} />)
        : <div className="border border-dashed border-black p-8 text-center">
          <strong className="font-display text-xl font-semibold">Noch kein Shot</strong>
          <p className="mt-2 text-xs leading-5 text-[var(--dialed-text-muted)]">Starte deinen ersten Bezug und baue deine persönliche Dial-in-Historie auf.</p>
        </div>}
    </div>
  </>;
}

function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="mt-8 mb-4 flex items-center justify-between gap-3 border-b border-black pb-3">
    <h2 className="font-display text-xl font-semibold">{title}</h2>
    {action}
  </div>;
}

function quickStartSummary(
  lastShot: DashboardData["shots"][number] | undefined,
  lastBean: DashboardData["beans"][number] | undefined,
) {
  if (lastShot) return `${formatWeight(lastShot.dose_grams)} · Mahlgrad ${lastShot.grind_setting ?? "—"} · zuletzt ${formatTime(lastShot.extraction_seconds)}`;
  if (lastBean) return `${lastBean.roaster} · bereit für den ersten Shot`;
  return "Füge zuerst eine Bohne hinzu";
}

export function DashboardSkeleton() {
  return <div>
    <div className="mb-[22px] flex items-center justify-between">
      <div className="space-y-2"><Skeleton className="h-3 w-40" /><Skeleton className="h-9 w-44" /></div>
      <Skeleton className="size-[42px]" />
    </div>
    <Skeleton className="h-[250px]" />
    <div className="mt-7 space-y-3"><Skeleton className="h-5 w-52" /><Skeleton className="h-[294px]" /></div>
    <div className="mt-2.5 grid grid-cols-3 gap-2">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-[76px]" />)}</div>
    <div className="mt-7 space-y-3"><Skeleton className="h-5 w-40" />{[0, 1, 2].map((item) => <Skeleton key={item} className="h-[210px] sm:h-[164px]" />)}</div>
  </div>;
}
