"use client";

import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import useSWR from "swr";
import { ShotDraftCard } from "@/components/shots/shot-draft-card";
import { ShotHistory } from "@/components/shots/shot-history";
import { fetchPrivateJson } from "@/lib/cache/fetch-private-json";
import { privateCacheKeys, privateCacheTtl } from "@/lib/cache/keys";
import type { ShotsPayload } from "@/lib/cache/types";

export function CachedShotHistory({ userId, initialData }: { userId: string; initialData: ShotsPayload }) {
  const { data = initialData, error, isValidating, mutate } = useSWR<ShotsPayload>(
    privateCacheKeys.shots(userId),
    () => fetchPrivateJson<ShotsPayload>("/api/app/shots"),
    {
      fallbackData: initialData,
      dedupingInterval: privateCacheTtl.shots,
      revalidateOnMount: false,
    },
  );

  return <>
    <header className="mb-6 flex items-center justify-between border-b border-black pb-5">
      <div><h1 className="font-display text-[32px] font-bold leading-[1.1]">Extraktionen</h1><p className="mt-2 text-[11px] font-semibold tracking-[.08em] text-[var(--dialed-text-muted)] uppercase">{data.shots.length} {data.shots.length === 1 ? "Shot" : "Shots"} angezeigt</p></div>
      <div className="flex items-center gap-2">{isValidating && <span title="Wird aktualisiert" className="grid size-8 place-items-center text-[var(--dialed-text-muted)]"><RefreshCw className="size-3.5 animate-spin" /></span>}<Link href="/app/shots/new" prefetch aria-label="Neuen Shot hinzufügen" className="grid size-11 place-items-center border border-black bg-black text-white hover:bg-white hover:text-black"><Plus className="size-[18px]" /></Link></div>
    </header>
    {error && <div role="alert" className="mb-4 flex min-h-11 items-center justify-between gap-3 border border-[var(--crema-error)] bg-[var(--dialed-rose-soft)] px-3 text-[10px] text-[var(--dialed-rose)]"><span>Aktualisierung fehlgeschlagen.</span><button type="button" onClick={() => void mutate()} className="inline-flex min-h-9 items-center gap-1.5 font-semibold tracking-[.08em] uppercase"><RefreshCw className="size-3.5"/>Erneut laden</button></div>}
    <ShotDraftCard userId={userId} beans={data.beans} />
    <ShotHistory shots={data.shots} />
  </>;
}
