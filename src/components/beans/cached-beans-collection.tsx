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
    <header className="mb-6 flex items-center justify-between border-b border-black pb-5"><div><h1 className="font-display text-[32px] font-bold leading-[1.1]">Bohnen</h1><p className="mt-2 text-[11px] font-semibold tracking-[.08em] text-[var(--dialed-text-muted)] uppercase">{active.length} aktive {active.length === 1 ? "Sorte" : "Sorten"}</p></div><div className="flex items-center gap-2">{isValidating && <span title="Wird aktualisiert" className="grid size-8 place-items-center text-[var(--dialed-text-muted)]"><RefreshCw className="size-3.5 animate-spin" /></span>}<Link href="/app/beans/new" prefetch aria-label="Neue Bohne hinzufügen" className="grid size-11 place-items-center border border-black bg-black text-white hover:bg-white hover:text-black"><Plus className="size-4" /></Link></div></header>
    {error && <div role="alert" className="mb-4 flex min-h-11 items-center justify-between gap-3 border border-[var(--crema-error)] bg-[var(--dialed-rose-soft)] px-3 text-[10px] text-[var(--dialed-rose)]"><span>Aktualisierung fehlgeschlagen.</span><button type="button" onClick={() => void mutate()} className="inline-flex min-h-9 items-center gap-1.5 font-semibold tracking-[.08em] uppercase"><RefreshCw className="size-3.5"/>Erneut laden</button></div>}
    {featured ? <article className="relative min-h-[220px] overflow-hidden border border-black bg-white p-6 pb-16"><span className="inline-flex items-center gap-2 border border-black bg-[var(--crema-surface-low)] py-1.5 pr-3 pl-1.5 text-[9px] font-semibold tracking-[.08em] text-black uppercase"><EntityIconFrame><BeanIcon origin={featured.origin} /></EntityIconFrame>Zuletzt verwendet</span><h2 className="mt-6 max-w-[190px] break-words pr-1 font-display text-[30px] font-semibold leading-[1.15]">{featured.name}</h2><p className="mt-2 max-w-[190px] break-words pr-1 text-xs leading-5 text-[var(--dialed-text-secondary)]">{featured.roaster} · {featured.origin || "Herkunft offen"}</p><span className="absolute right-[132px] bottom-5 left-6 truncate text-[10px] font-semibold tracking-[.06em] text-[var(--dialed-text-muted)] uppercase">{featured.roast_date ? `Geröstet vor ${roastAgeDays(featured.roast_date)} Tagen` : "Röstdatum nicht angegeben"}</span><div className="bean-visual !top-[52px] !right-[28px] !h-28 !w-[84px] max-[360px]:hidden" /></article> : <div className="border border-dashed border-black p-9 text-center"><EntityIconFrame size="md" className="mx-auto"><BeanIcon /></EntityIconFrame><h2 className="mt-4 font-display text-2xl font-semibold">Noch keine Bohne</h2><p className="mt-2 text-xs text-[var(--dialed-text-muted)]">Lege deine erste Sorte an, um einen Shot zu starten.</p></div>}
    <div className="mt-8 mb-4 flex justify-between border-b border-black pb-3"><h2 className="font-display text-xl font-semibold">Deine Sammlung</h2><Link href="/app/beans/new" prefetch className="text-[10px] font-semibold tracking-[.1em] text-black uppercase underline underline-offset-4">Hinzufügen</Link></div>
    <div className="grid gap-2.5">{active.map((bean) => <Link key={bean.id} href={`/app/beans/${bean.id}`} prefetch className="grid min-h-[82px] grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 border border-[var(--crema-outline-soft)] bg-white p-4 hover:border-black hover:bg-[var(--crema-surface-low)]"><EntityIconFrame size="lg"><BeanIcon origin={bean.origin} className="text-[24px] [&_svg]:size-5" /></EntityIconFrame><span className="min-w-0 overflow-hidden"><strong className="block truncate font-display text-base font-semibold">{bean.name}</strong><small className="mt-1 block truncate text-[10px] text-[var(--dialed-text-muted)]">{bean.roaster} · {bean.origin || "Ohne Herkunft"}</small></span><span className="shrink-0 border-l pl-3 text-right"><strong className="block text-[11px] tabular">{bean.roast_date ? `${roastAgeDays(bean.roast_date)} Tage` : "Nicht angegeben"}</strong><small className="text-[9px] font-semibold tracking-[.08em] text-[var(--dialed-text-muted)] uppercase">{data.shotCounts[bean.id] ?? 0} Shots</small></span></Link>)}</div>
  </div>;
}
