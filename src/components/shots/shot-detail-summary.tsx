import { CircleDot, Gauge, ListChecks, NotebookText, Scale, Timer, Weight } from "lucide-react";
import { EquipmentIdentity } from "@/components/entities/entity-icons";
import { brewRatio } from "@/lib/calculations";
import { formatWeight } from "@/lib/formatting";
import type { Equipment, ShotWithBean } from "@/types/domain";
import { RatioVisual, TasteScale, YieldFlowGraphic } from "./shot-visuals";

export function ShotDetailSummary({ shot }: { shot: ShotWithBean }) {
  const ratio = brewRatio(shot.final_yield_grams, shot.dose_grams);

  return <>
    <section className="rounded-[24px] border bg-white p-4 shadow-[var(--shadow-sm)]" aria-labelledby="shot-key-data">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[var(--dialed-crema-soft)] text-[var(--dialed-crema)]"><Gauge aria-hidden="true" className="size-4.5" /></span>
        <div>
          <h2 id="shot-key-data" className="text-sm font-extrabold">Extraktion auf einen Blick</h2>
          <p className="mt-0.5 text-xs text-[var(--dialed-text-muted)]">Die entscheidenden Werte dieses Shots</p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x border-y py-3">
        <QuickMetric icon={Gauge} label="Mahlgrad" value={shot.grind_setting ?? "—"} />
        <QuickMetric icon={Timer} label="Zeit" value={shot.extraction_seconds === null ? "—" : `${shot.extraction_seconds.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`} />
        <QuickMetric icon={Weight} label="Dosis" value={formatWeight(shot.dose_grams)} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">
        <RatioVisual ratio={ratio} />
        <YieldFlowGraphic stopWeight={shot.stop_weight_grams} finalWeight={shot.final_yield_grams} />
      </div>
    </section>

    <section className="mt-3 rounded-[24px] border bg-white p-4 shadow-[var(--shadow-sm)]" aria-labelledby="shot-taste">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[var(--dialed-sage-soft)] text-[var(--dialed-sage)]"><ListChecks aria-hidden="true" className="size-4.5" /></span>
        <h2 id="shot-taste" className="text-sm font-extrabold">Geschmack & Bewertung</h2>
      </div>
      <TasteScale taste={shot.taste} rating={shot.overall_taste_rating} />
    </section>
  </>;
}

export function ShotMoreDetails({
  shot,
  machine,
  grinder,
  basket,
}: {
  shot: ShotWithBean;
  machine: Pick<Equipment, "name" | "type"> | null;
  grinder: Pick<Equipment, "name" | "type"> | null;
  basket: Pick<Equipment, "name" | "type"> | null;
}) {
  const prepTools = shot.prep_tools?.length ? shot.prep_tools.join(" · ") : "Keine angegeben";

  return <section className="mt-3 overflow-hidden rounded-[24px] border bg-white shadow-[var(--shadow-sm)]" aria-labelledby="shot-more-details">
    <div className="flex items-center gap-3 px-4 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[var(--dialed-surface-subtle)] text-[var(--dialed-crema)]"><Scale aria-hidden="true" className="size-4.5" /></span>
      <h2 id="shot-more-details" className="text-sm font-extrabold">Weitere Angaben</h2>
    </div>
    <div className="grid sm:grid-cols-2">
      <EntityDetail label="Maschine"><EquipmentIdentity equipment={machine} type="machine" fallback="Nicht angegeben" /></EntityDetail>
      <EntityDetail label="Mühle"><EquipmentIdentity equipment={grinder} type="grinder" fallback="Nicht angegeben" /></EntityDetail>
      {basket && <EntityDetail label="Sieb"><EquipmentIdentity equipment={basket} type="basket" fallback="Nicht angegeben" /></EntityDetail>}
      <DetailRow icon={ListChecks} label="Puck-Prep" value={prepTools} />
      <DetailRow icon={Gauge} label="Extraktionsbild" value={extractionPictureLabel(shot.flow)} />
      <DetailRow icon={CircleDot} label="Puck" value={puckLabel(shot.puck)} />
      <DetailRow icon={NotebookText} label="Notiz" value={shot.notes || "Keine Notiz"} wide />
    </div>
  </section>;
}

function QuickMetric({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return <div className="min-w-0 px-2 text-center first:pl-0 last:pr-0">
    <span className="flex items-center justify-center gap-1 text-xs text-[var(--dialed-text-muted)]"><Icon aria-hidden="true" className="size-3.5" />{label}</span>
    <strong className="mt-1.5 block truncate text-[15px]">{value}</strong>
  </div>;
}

function EntityDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 border-t px-4 py-3.5 sm:odd:border-r">
    <span className="mb-2 block text-xs text-[var(--dialed-text-muted)]">{label}</span>
    <div className="min-w-0 text-xs">{children}</div>
  </div>;
}

function DetailRow({ icon: Icon, label, value, wide = false }: { icon: typeof Gauge; label: string; value: string; wide?: boolean }) {
  return <div className={`${wide ? "sm:col-span-2" : "sm:odd:border-r"} grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-start gap-2.5 border-t px-4 py-3.5`}>
    <span className="grid size-8 place-items-center rounded-[10px] bg-[var(--dialed-surface-subtle)] text-[var(--dialed-text-secondary)]"><Icon aria-hidden="true" className="size-4" /></span>
    <span className="min-w-0">
      <span className="block text-xs text-[var(--dialed-text-muted)]">{label}</span>
      <strong className="mt-1 block break-words text-xs leading-5">{value}</strong>
    </span>
  </div>;
}

function extractionPictureLabel(flow: ShotWithBean["flow"]) {
  return flow ? ({ even: "Gleichmäßig", minor_channeling: "Leichtes Channeling", channeling: "Starkes Channeling" })[flow] : "Nicht angegeben";
}

function puckLabel(puck: ShotWithBean["puck"]) {
  return puck ? ({ dry: "Trocken", ideal: "Normal", wet: "Nass", stuck: "Festhängend" })[puck] : "Nicht angegeben";
}
