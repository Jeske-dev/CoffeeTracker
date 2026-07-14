"use client";

import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import useSWR from "swr";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";
import { roastAgeDays } from "@/lib/calculations";
import { fetchPrivateJson } from "@/lib/cache/fetch-private-json";
import { privateCacheKeys, privateCacheTtl } from "@/lib/cache/keys";
import type { BeansPayload } from "@/lib/cache/types";

export function CachedBeansCollection({ userId, initialData }: { userId: string; initialData: BeansPayload }) {
  const { data = initialData, error, isValidating, mutate } = useSWR<BeansPayload>(
    privateCacheKeys.beans(userId),
    () => fetchPrivateJson<BeansPayload>("/api/app/beans"),
    {
      fallbackData: initialData,
      dedupingInterval: privateCacheTtl.beans,
      revalidateOnMount: false,
    },
  );
  const active = data.beans.filter((bean) => !bean.archived_at);
  const featured = active.find((bean) => bean.id === data.lastBeanId) ?? active[0];

  return <div>
    <header className="mx-0.5 mb-5 flex items-center justify-between"><div><h1 className="font-display text-[30px]">Bohnen</h1><p className="mt-1 text-[11px] text-[var(--dialed-text-muted)]">{active.length} aktive {active.length === 1 ? "Sorte" : "Sorten"}</p></div><div className="flex items-center gap-2">{isValidating && <span title="Wird aktualisiert" className="grid size-8 place-items-center text-[var(--dialed-text-muted)]"><RefreshCw className="size-3.5 animate-spin" /></span>}<Link href="/app/beans/new" prefetch aria-label="Neue Bohne hinzufügen" className="grid size-11 place-items-center rounded-full bg-[var(--dialed-espresso)] text-white"><Plus className="size-4" /></Link></div></header>
    {error && <div role="alert" className="mb-3 flex min-h-11 items-center justify-between gap-3 rounded-[14px] bg-[var(--dialed-rose-soft)] px-3 text-[10px] text-[var(--dialed-rose)]"><span>Aktualisierung fehlgeschlagen.</span><button type="button" onClick={() => void mutate()} className="inline-flex min-h-9 items-center gap-1.5 font-bold"><RefreshCw className="size-3.5"/>Erneut laden</button></div>}
    {featured ? <article className="relative min-h-[200px] overflow-hidden rounded-[30px] border bg-[linear-gradient(140deg,#ead5c5,#f6ede4_58%,#e5e8df)] p-[19px] pb-14"><span className="inline-flex items-center gap-2 rounded-full bg-white/70 py-1.5 pr-2.5 pl-1.5 text-[9px] font-bold text-[var(--dialed-text-secondary)]"><EntityIconFrame><BeanIcon origin={featured.origin} /></EntityIconFrame>Zuletzt verwendet</span><h2 className="font-display mt-5 max-w-[190px] break-words pr-1 text-[27px] leading-tight">{featured.name}</h2><p className="mt-1 max-w-[190px] break-words pr-1 text-[11px] leading-4 text-[var(--dialed-text-secondary)]">{featured.roaster} · {featured.origin || "Herkunft offen"}</p><span className="absolute right-[118px] bottom-[18px] left-[19px] truncate text-[10px] text-[var(--dialed-text-muted)]">{featured.roast_date ? `Geröstet vor ${roastAgeDays(featured.roast_date)} Tagen` : "Röstdatum nicht angegeben"}</span><div className="bean-visual !top-[48px] !right-[21px] !h-28 !w-[84px]" /></article> : <div className="rounded-[30px] border border-dashed p-9 text-center"><EntityIconFrame size="md" className="mx-auto"><BeanIcon /></EntityIconFrame><h2 className="font-display mt-3 text-2xl">Noch keine Bohne</h2><p className="mt-2 text-xs text-[var(--dialed-text-muted)]">Lege deine erste Sorte an, um einen Shot zu starten.</p></div>}
    <div className="mt-7 mb-3 flex justify-between"><h2 className="font-bold">Deine Sammlung</h2><Link href="/app/beans/new" prefetch className="text-xs font-bold text-[var(--dialed-crema)]">Hinzufügen</Link></div>
    <div className="grid gap-2.5">{active.map((bean) => <Link key={bean.id} href={`/app/beans/${bean.id}`} prefetch className="grid min-h-[78px] grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border bg-white p-[15px]"><EntityIconFrame size="lg"><BeanIcon origin={bean.origin} className="text-[24px] [&_svg]:size-5" /></EntityIconFrame><span className="min-w-0 overflow-hidden"><strong className="block truncate text-[13px]">{bean.name}</strong><small className="mt-1 block truncate text-[10px] text-[var(--dialed-text-muted)]">{bean.roaster} · {bean.origin || "Ohne Herkunft"}</small></span><span className="shrink-0 text-right"><strong className="block text-[11px]">{bean.roast_date ? `${roastAgeDays(bean.roast_date)} Tage` : "Nicht angegeben"}</strong><small className="text-[10px] text-[var(--dialed-text-muted)]">{data.shotCounts[bean.id] ?? 0} Shots</small></span></Link>)}</div>
  </div>;
}
