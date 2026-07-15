import { CircleHelp, Gauge, ListChecks, NotebookText, Scale, Timer, Weight, type LucideIcon } from "lucide-react";
import { EquipmentIdentity } from "@/components/entities/entity-icons";
import { DataMetric, LabeledValue } from "@/components/ui/data-metric";
import { SectionCard } from "@/components/ui/section-card";
import { formatTime, formatWeight } from "@/lib/formatting";
import { puckStateLabel, puckStateTone, shotFlowLabel, shotFlowTone, type ShotSelectionTone } from "@/lib/shot-options";
import type { Equipment, ShotWithBean } from "@/types/domain";
import { puckStateIcons, shotFlowIcons } from "./shot-option-icons";
import { shotSelectionToneClasses } from "./shot-selection-tone";
import { TasteScale, YieldFlowGraphic } from "./shot-visuals";

export function ShotDetailSummary({ shot }: { shot: ShotWithBean }) {
  return <>
    <SectionCard title="Extraktion auf einen Blick" description="Die entscheidenden Werte dieses Shots" icon={Gauge} tone="crema">
      <div className="grid grid-cols-3 divide-x border-y border-black py-3">
        <DataMetric icon={Gauge} label="Mahlgrad" value={shot.grind_setting ?? "—"} align="center" className="px-2 first:pl-0 last:pr-0" valueClassName="text-[15px]" />
        <DataMetric icon={Timer} label="Zeit" value={formatTime(shot.extraction_seconds)} align="center" className="px-2 first:pl-0 last:pr-0" valueClassName="text-[15px]" />
        <DataMetric icon={Weight} label="Dosis" value={formatWeight(shot.dose_grams)} align="center" className="px-2 first:pl-0 last:pr-0" valueClassName="text-[15px]" />
      </div>

      <div className="mt-4">
        <YieldFlowGraphic stopWeight={shot.stop_weight_grams} finalWeight={shot.final_yield_grams} />
      </div>
    </SectionCard>

    <SectionCard title="Geschmack & Bewertung" icon={ListChecks} tone="sage" className="mt-3">
      <TasteScale taste={shot.taste} rating={shot.overall_taste_rating} />
    </SectionCard>
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
  const FlowIcon = shot.flow ? shotFlowIcons[shot.flow] : CircleHelp;
  const PuckIcon = shot.puck ? puckStateIcons[shot.puck] : CircleHelp;

  return <SectionCard title="Weitere Angaben" icon={Scale} className="mt-4 overflow-hidden" bodyClassName="-mx-5 -mb-5">
    <div className="grid sm:grid-cols-2">
      <EntityDetail label="Maschine"><EquipmentIdentity equipment={machine} type="machine" fallback="Nicht angegeben" /></EntityDetail>
      <EntityDetail label="Mühle"><EquipmentIdentity equipment={grinder} type="grinder" fallback="Nicht angegeben" /></EntityDetail>
      {basket && <EntityDetail label="Sieb"><EquipmentIdentity equipment={basket} type="basket" fallback="Nicht angegeben" /></EntityDetail>}
      <DetailRow icon={ListChecks} label="Puck-Prep" value={prepTools} />
      <DetailRow icon={FlowIcon} label="Extraktionsbild" value={shotFlowLabel(shot.flow)} tone={shotFlowTone(shot.flow)} />
      <DetailRow icon={PuckIcon} label="Puck" value={puckStateLabel(shot.puck)} tone={puckStateTone(shot.puck)} />
      <DetailRow icon={NotebookText} label="Notiz" value={shot.notes || "Keine Notiz"} wide />
    </div>
  </SectionCard>;
}

function EntityDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return <LabeledValue label={label} className="border-t px-5 py-4 sm:odd:border-r">{children}</LabeledValue>;
}

function DetailRow({ icon: Icon, label, value, tone, wide = false }: { icon: LucideIcon; label: string; value: string; tone?: ShotSelectionTone | null; wide?: boolean }) {
  return <div data-selection-tone={tone ?? undefined} className={`${wide ? "sm:col-span-2" : "sm:odd:border-r"} grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-start gap-3 border-t px-5 py-4`}>
    <span className={`grid size-8 place-items-center border ${tone ? shotSelectionToneClasses[tone] : "bg-[var(--dialed-surface-subtle)] text-black"}`}><Icon aria-hidden="true" className="size-4" /></span>
    <DataMetric label={label} value={value} truncateValue={false} valueClassName="mt-1 whitespace-normal text-xs leading-5" />
  </div>;
}
