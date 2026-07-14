"use client";
import { useState } from "react";
import { isSweetSpot, brewRatio } from "@/lib/calculations";
import { ShotCard } from "./shot-card";
import type { ShotSummary } from "@/types/domain";

const filters = ["Alle", "Sweet Spot", "Sauer", "Bitter"] as const;
export function ShotHistory({ shots }: { shots: ShotSummary[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Alle");
  const filtered = shots.filter((s) => {
    if (filter === "Alle") return true;
    if (filter === "Sweet Spot") return isSweetSpot(s.extraction_seconds, brewRatio(s.final_yield_grams, s.dose_grams));
    if (s.taste === null) return false;
    return filter === "Sauer" ? s.taste === "sour" : s.taste === "bitter";
  });
  return <><div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} aria-pressed={filter === item} className={`min-h-11 whitespace-nowrap rounded-full border px-4 text-[11px] ${filter === item ? "border-[var(--dialed-espresso)] bg-[var(--dialed-espresso)] font-bold text-white" : "bg-white text-[var(--dialed-text-secondary)]"}`}>{item}</button>)}</div><div className="grid gap-2.5">{filtered.length ? filtered.map((s) => <ShotCard key={s.id} shot={s} />) : <div className="rounded-[24px] border border-dashed p-10 text-center"><strong className="font-display text-xl font-medium">Keine Treffer</strong><p className="mt-2 text-xs text-[var(--dialed-text-muted)]">Für diesen Filter gibt es noch keine dokumentierten Shots.</p></div>}</div></>;
}
