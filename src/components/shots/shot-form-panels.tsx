import Link from "next/link";
import { Info, Lightbulb, Settings2 } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { EquipmentIdentity } from "@/components/entities/entity-icons";
import { LabeledValue } from "@/components/ui/data-metric";
import { SectionCard } from "@/components/ui/section-card";
import { Textarea } from "@/components/ui/textarea";
import type { StopWeightTip } from "@/features/shots/stop-weight-tip";
import { formatWeight } from "@/lib/formatting";
import { PUCK_STATE_OPTIONS, SHOT_FLOW_OPTIONS } from "@/lib/shot-options";
import type { Equipment, PuckState, ShotFlow, ShotTaste } from "@/types/domain";
import { NumberControl, SegmentedControl } from "./shot-form-controls";
import { puckStateIcons, shotFlowIcons } from "./shot-option-icons";
import { ShotExtractionSection, ShotReviewSection } from "./shot-sections";
import { TasteScale, YieldInputGraphic } from "./shot-visuals";

const flowSegments = SHOT_FLOW_OPTIONS.map(({ value, label }) => [value, label, shotFlowIcons[value]] as const);
const puckSegments = PUCK_STATE_OPTIONS.map(({ value, label }) => [value, label, puckStateIcons[value]] as const);

export function ShotSetupSummary({
  machine,
  grinder,
}: {
  machine: Equipment | null;
  grinder: Equipment | null;
}) {
  return <SectionCard title="Setup" icon={Settings2} className="mb-3">
    <div className="grid gap-4 sm:grid-cols-2">
      <LabeledValue label="Maschine"><EquipmentIdentity equipment={machine} type="machine" fallback="Nicht festgelegt" /></LabeledValue>
      <LabeledValue label="Mühle"><EquipmentIdentity equipment={grinder} type="grinder" fallback="Nicht festgelegt" /></LabeledValue>
    </div>
    <p className="mt-5 flex items-start gap-2 border-t pt-4 text-xs leading-5 text-[var(--dialed-text-muted)]">
      <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>Maschine und Mühle gelten für den Shot. <Link href="/app/setup" className="font-semibold text-black underline underline-offset-4">In den Einstellungen ändern</Link></span>
    </p>
  </SectionCard>;
}

export function ShotExtractionFormSection({
  stopWeightGrams,
  finalYieldGrams,
  timeRegistration,
  stopRegistration,
  finalYieldRegistration,
  stopTip,
}: {
  stopWeightGrams: number | null;
  finalYieldGrams: number | null | undefined;
  timeRegistration: UseFormRegisterReturn;
  stopRegistration: UseFormRegisterReturn;
  finalYieldRegistration: UseFormRegisterReturn;
  stopTip?: StopWeightTip | null;
}) {
  return <ShotExtractionSection
    summary={<>
      <YieldInputGraphic
        stopWeight={stopWeightGrams}
        finalWeight={finalYieldGrams ?? null}
        stopControl={<NumberControl ariaLabel="Stop-Gewicht" unit="g" registration={stopRegistration} />}
        finalControl={<NumberControl ariaLabel="Finales Getränkgewicht" unit="g" registration={finalYieldRegistration} />}
      />
      {stopTip && <StopWeightTipCard tip={stopTip} />}
    </>}
    fields={{
      time: { value: <NumberControl ariaLabel="Extraktionszeit" unit="s" registration={timeRegistration} /> },
    }}
  />;
}

function StopWeightTipCard({ tip }: { tip: StopWeightTip }) {
  const sampleLabel = `${tip.sampleSize} ${tip.sampleSize === 1 ? "Shot" : "Shots"}`;
  const explanation = tip.source === "matching_history"
    ? `${sampleLabel} mit gleicher Bohne und gleichem Mahlgrad zeigen typischerweise ${formatWeight(tip.expectedOvershootGrams)} Nachlauf.`
    : tip.source === "scaled_history"
      ? `Aus ${sampleLabel} wurde der Nachlauf proportional auf ${formatWeight(tip.targetFinalWeightGrams)} hochgerechnet.`
      : "Startwert per Dreisatz: 34 g Stop bei 36 g in der Tasse.";

  return <aside aria-label={`Stopptipp: bei ${formatWeight(tip.recommendedStopWeightGrams)} stoppen`} className="mt-3 flex items-start gap-2.5 border border-black bg-[var(--crema-surface-mid)] px-3 py-3 text-black">
    <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
    <div className="min-w-0">
      <strong className="block text-xs">Bei etwa {formatWeight(tip.recommendedStopWeightGrams)} stoppen</strong>
      <p className="mt-0.5 text-[10px] leading-4 text-[var(--dialed-text-secondary)]">{explanation}</p>
    </div>
  </aside>;
}

export function ShotReviewFormSection({
  taste,
  rating,
  flow,
  puck,
  notesRegistration,
  onTasteChange,
  onFlowChange,
  onPuckChange,
}: {
  taste: ShotTaste | null;
  rating: number | null;
  flow: ShotFlow | null;
  puck: PuckState | null;
  notesRegistration: UseFormRegisterReturn;
  onTasteChange: (taste: ShotTaste | null, rating: number | null) => void;
  onFlowChange: (flow: ShotFlow | null) => void;
  onPuckChange: (puck: PuckState | null) => void;
}) {
  return <ShotReviewSection fields={{
    taste: { value: <TasteScale taste={taste} rating={rating} onChange={onTasteChange} /> },
    extractionPicture: { value: <SegmentedControl values={flowSegments} active={flow} onSelect={(value) => onFlowChange(flow === value ? null : value)} /> },
    puck: { value: <SegmentedControl values={puckSegments} active={puck} onSelect={(value) => onPuckChange(puck === value ? null : value)} columns={4} /> },
    notes: { value: <Textarea aria-label="Notiz" className="min-h-24 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0" placeholder="Optional" {...notesRegistration} /> },
  }} />;
}
