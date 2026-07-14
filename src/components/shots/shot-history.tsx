"use client";

import { useState } from "react";
import { ChevronDown, LayoutGrid, Table2 } from "lucide-react";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";
import { ShotCard } from "./shot-card";
import { ShotTable } from "./shot-table";
import type { ShotSummary } from "@/types/domain";

export function ShotHistory({ shots }: { shots: ShotSummary[] }) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [beanId, setBeanId] = useState("all");

  if (!shots.length) {
    return <div className="border border-dashed border-black p-10 text-center">
      <strong className="font-display text-xl font-semibold">Noch keine Shots</strong>
      <p className="mt-2 text-xs text-[var(--dialed-text-muted)]">Deine gespeicherten Extraktionen erscheinen hier.</p>
    </div>;
  }

  const beanOptions = [...new Map(shots.flatMap((shot) => shot.beans ? [[shot.beans.id, shot.beans] as const] : [])).values()]
    .sort((left, right) => left.name.localeCompare(right.name, "de"));
  const effectiveBeanId = beanId === "all" || beanOptions.some((bean) => bean.id === beanId) ? beanId : "all";
  const selectedBean = beanOptions.find((bean) => bean.id === effectiveBeanId) ?? null;
  const filteredShots = effectiveBeanId === "all" ? shots : shots.filter((shot) => shot.bean_id === effectiveBeanId);

  return <section aria-label="Shot-Historie">
    <div className="mb-3 flex items-center justify-between gap-2">
      <label className="relative flex min-h-[52px] min-w-0 max-w-[250px] flex-1 items-center gap-2 border border-black bg-white px-2.5">
        <EntityIconFrame><BeanIcon origin={selectedBean?.origin} /></EntityIconFrame>
        <select aria-label="Nach Bohne filtern" value={effectiveBeanId} onChange={(event) => setBeanId(event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent pr-6 text-xs font-bold outline-none">
          <option value="all">Alle Bohnen</option>
          {beanOptions.map((bean) => <option key={bean.id} value={bean.id}>{bean.name}</option>)}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 size-3.5 text-[var(--dialed-text-muted)]" />
      </label>
      <div role="group" aria-label="Darstellung" className="inline-grid grid-cols-2 border border-black bg-white">
        <ViewButton active={view === "cards"} label="Kartenansicht" onClick={() => setView("cards")}><LayoutGrid className="size-4" /></ViewButton>
        <ViewButton active={view === "table"} label="Tabellenansicht" onClick={() => setView("table")}><Table2 className="size-4" /></ViewButton>
      </div>
    </div>
    {filteredShots.length
      ? view === "cards"
        ? <div className="grid gap-2.5">{filteredShots.map((shot) => <ShotCard key={shot.id} shot={shot} />)}</div>
        : <ShotTable shots={filteredShots} />
      : <div className="border border-dashed border-black p-8 text-center"><strong className="font-display text-xl font-semibold">Keine Shots für diese Bohne</strong><p className="mt-2 text-xs text-[var(--dialed-text-muted)]">Wähle eine andere Bohne oder zeige wieder alle an.</p></div>}
  </section>;
}

function ViewButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={active}
    onClick={onClick}
    className={`grid size-11 place-items-center border-r border-black last:border-r-0 ${active ? "bg-black text-white" : "text-[var(--dialed-text-muted)] hover:bg-[var(--dialed-surface-subtle)] hover:text-black"}`}
  >{children}</button>;
}
