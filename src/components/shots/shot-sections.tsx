import type { ReactNode } from "react";
import { Bean, Coffee, Gauge, ListChecks, Scale, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ShotFormMode = "create" | "view" | "edit";

type FieldValue = {
  value: ReactNode;
  hint?: ReactNode;
  wide?: boolean;
  highlighted?: boolean;
};

type SetupFields = {
  shotAt?: FieldValue;
  bean: FieldValue;
  machine: FieldValue;
  grinder: FieldValue;
  grind: FieldValue;
  dose: FieldValue;
  wdt: FieldValue;
  puckScreen: FieldValue;
  basket?: FieldValue;
};

type ExtractionFields = {
  time: FieldValue;
  finalYield: FieldValue;
  ratio: FieldValue;
  stopWeight?: FieldValue;
  overshoot?: FieldValue;
};

type ReviewFields = {
  rating: FieldValue;
  taste: FieldValue;
  extractionPicture: FieldValue;
  puck: FieldValue;
  notes: FieldValue;
  score?: FieldValue;
};

export function ShotSummaryCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return <section className="mb-3 rounded-[24px] border bg-white p-4 shadow-[var(--shadow-sm)]">
    <div className="mb-3 flex min-h-10 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-[var(--dialed-surface-subtle)] text-[var(--dialed-crema)]"><Icon className="size-4.5" /></span>
      <h2 className="min-w-0 flex-1 text-sm font-extrabold">{title}</h2>
      {action}
    </div>
    {children}
  </section>;
}

export function ShotField({ label, field, mode }: { label: string; field: FieldValue; mode: ShotFormMode }) {
  return <div className={`${field.wide ? "col-span-2" : ""} min-w-0`} data-shot-field={label}>
    <div className={`min-h-14 rounded-[16px] border px-3 py-2.5 transition-colors ${field.highlighted ? "border-[var(--dialed-sage)]/35 bg-[var(--dialed-sage-soft)]/45" : mode === "view" ? "border-transparent bg-[var(--dialed-surface-subtle)]" : "bg-white"}`}>
      <small className="mb-1 block text-[9px] font-medium text-[var(--dialed-text-muted)]">{label}</small>
      <div className={`min-w-0 ${mode === "view" ? "truncate text-xs font-bold" : "text-xs"}`}>{field.value}</div>
    </div>
    {field.hint}
  </div>;
}

function FieldGrid({ mode, fields }: { mode: ShotFormMode; fields: Array<[string, FieldValue | undefined]> }) {
  return <div className="grid grid-cols-2 gap-2">
    {fields.flatMap(([label, field]) => field ? [<ShotField key={label} label={label} field={field} mode={mode} />] : [])}
  </div>;
}

export function ShotSetupSection({ mode, fields, action }: { mode: ShotFormMode; fields: SetupFields; action?: ReactNode }) {
  return <ShotSummaryCard title="Setup" icon={Bean} action={action}>
    <FieldGrid mode={mode} fields={[
      ["Zeitpunkt", fields.shotAt ? { ...fields.shotAt, wide: true } : undefined],
      ["Bohne", { ...fields.bean, wide: true }],
      ["Maschine", fields.machine],
      ["Mühle", fields.grinder],
      ["Mahlgrad", fields.grind],
      ["Dosis", fields.dose],
      ["WDT", fields.wdt],
      ["Puck Screen", fields.puckScreen],
      ["Sieb", fields.basket],
    ]} />
  </ShotSummaryCard>;
}

export function ShotExtractionSection({
  mode,
  fields,
  timer,
  summary,
}: {
  mode: ShotFormMode;
  fields: ExtractionFields;
  timer?: ReactNode;
  summary?: ReactNode;
}) {
  return <ShotSummaryCard title="Extraktion" icon={Timer}>
    {timer}
    {summary}
    <FieldGrid mode={mode} fields={[
      ["Extraktionszeit", fields.time],
      ["Finales Getränkgewicht", fields.finalYield],
      ["Brew Ratio", fields.ratio],
      ["Stop-Gewicht", fields.stopWeight],
      ["Nachlauf", fields.overshoot],
    ]} />
  </ShotSummaryCard>;
}

export function ShotReviewSection({ mode, fields }: { mode: ShotFormMode; fields: ReviewFields }) {
  return <ShotSummaryCard title="Bewertung" icon={ListChecks}>
    <FieldGrid mode={mode} fields={[
      ["Gesamtbewertung", { ...fields.rating, wide: true }],
      ["Geschmack", { ...fields.taste, wide: true }],
      ["Extraktionsbild", { ...fields.extractionPicture, wide: true }],
      ["Puck", { ...fields.puck, wide: true }],
      ["Notiz", { ...fields.notes, wide: true }],
      ["Dialed Score", fields.score ? { ...fields.score, wide: true } : undefined],
    ]} />
  </ShotSummaryCard>;
}

export const shotSectionIcons = { setup: Coffee, grind: Gauge, dose: Scale };
