import type { ReactNode } from "react";
import { Bean, CircleDot, Gauge, ListChecks, NotebookText, Scale, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";

type FieldValue = {
  value: ReactNode;
  hint?: ReactNode;
  wide?: boolean;
  highlighted?: boolean;
  icon?: LucideIcon;
};

type SetupFields = {
  shotAt?: FieldValue;
  bean: FieldValue;
  machine: FieldValue;
  grinder: FieldValue;
  grind: FieldValue;
  dose: FieldValue;
  prepTools: FieldValue;
};

type RecipeFields = {
  bean: FieldValue;
  grind: FieldValue;
  dose: FieldValue;
  prepTools: FieldValue;
};

type ExtractionFields = {
  time: FieldValue;
};

type ReviewFields = {
  taste: FieldValue;
  extractionPicture: FieldValue;
  puck: FieldValue;
  notes: FieldValue;
};

export function ShotField({ label, field }: { label: string; field: FieldValue }) {
  const Icon = field.icon;
  return <div className={`${field.wide ? "min-[380px]:col-span-2" : ""} min-w-0`} data-shot-field={label}>
    <div className={`min-h-14 border-b px-0 py-2.5 transition-colors ${field.highlighted ? "border-black bg-[var(--crema-surface-mid)] px-2" : "border-[var(--crema-outline-soft)] bg-transparent"}`}>
      <small className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-[.08em] text-[var(--dialed-text-muted)] uppercase">{Icon && <Icon aria-hidden="true" className="size-3.5" />}{label}</small>
      <div className="min-w-0 text-xs">{field.value}</div>
    </div>
    {field.hint}
  </div>;
}

function FieldGrid({ fields }: { fields: Array<[string, FieldValue | undefined]> }) {
  return <div className="grid grid-cols-1 gap-x-4 gap-y-3 min-[380px]:grid-cols-2">
    {fields.flatMap(([label, field]) => field ? [<ShotField key={label} label={label} field={field} />] : [])}
  </div>;
}

export function ShotRecipeSection({ fields }: { fields: RecipeFields }) {
  return <SectionCard title="Rezept" icon={Scale} className="mb-3">
    <FieldGrid fields={[
      ["Bohne", { ...fields.bean, wide: true, icon: fields.bean.icon ?? Bean }],
      ["Mahlgrad", { ...fields.grind, icon: fields.grind.icon ?? Gauge }],
      ["Dosis", { ...fields.dose, icon: fields.dose.icon ?? Scale }],
      ["Puck-Prep", { ...fields.prepTools, wide: true, icon: fields.prepTools.icon ?? ListChecks }],
    ]} />
  </SectionCard>;
}

export function ShotSetupSection({ fields }: { fields: SetupFields }) {
  return <SectionCard title="Setup" icon={Bean} className="mb-3">
    <FieldGrid fields={[
      ["Bohne", { ...fields.bean, wide: true, icon: fields.bean.icon ?? Bean }],
      ["Mahlgrad", { ...fields.grind, icon: fields.grind.icon ?? Gauge }],
      ["Dosis", { ...fields.dose, icon: fields.dose.icon ?? Scale }],
      ["Puck-Prep", { ...fields.prepTools, wide: true, icon: fields.prepTools.icon ?? ListChecks }],
      ["Maschine", fields.machine],
      ["Mühle", fields.grinder],
      ["Zeitpunkt", fields.shotAt ? { ...fields.shotAt, wide: true } : undefined],
    ]} />
  </SectionCard>;
}

export function ShotExtractionSection({
  fields,
  summary,
}: {
  fields: ExtractionFields;
  summary?: ReactNode;
}) {
  return <SectionCard title="Extraktion" icon={Timer} className="mb-3">
    {summary}
    <div className={summary ? "mt-4 border-t border-black/[.07] pt-4" : ""}>
      <FieldGrid fields={[
        ["Extraktionszeit", { ...fields.time, wide: true, icon: fields.time.icon ?? Timer }],
      ]} />
    </div>
  </SectionCard>;
}

export function ShotReviewSection({ fields }: { fields: ReviewFields }) {
  return <SectionCard title="Bewertung" icon={ListChecks} className="mb-3">
    <FieldGrid fields={[
      ["Geschmack", { ...fields.taste, wide: true, icon: fields.taste.icon ?? Scale }],
      ["Extraktionsbild", { ...fields.extractionPicture, wide: true, icon: fields.extractionPicture.icon ?? Gauge }],
      ["Puck", { ...fields.puck, wide: true, icon: fields.puck.icon ?? CircleDot }],
      ["Notiz", { ...fields.notes, wide: true, icon: fields.notes.icon ?? NotebookText }],
    ]} />
  </SectionCard>;
}
