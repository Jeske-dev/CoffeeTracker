import { Check, Minus, Plus, type LucideIcon } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BeanIcon, EntityIconFrame, EquipmentIcon } from "@/components/entities/entity-icons";
import { PREP_TOOLS, type PrepTool } from "@/lib/prep-tools";
import type { Bean, Equipment, EquipmentType } from "@/types/domain";

const isBlank = (value: unknown) => value === "" || value === null || value === undefined;

export const nullableString = { setValueAs: (value: unknown) => isBlank(value) ? null : String(value) };
export const nullableNumber = { setValueAs: (value: unknown) => isBlank(value) ? null : Number(value) };
export const requiredNumber = { setValueAs: (value: unknown) => isBlank(value) ? undefined : Number(value) };

export function NumberControl({ ariaLabel, unit, registration }: { ariaLabel: string; unit: string; registration: UseFormRegisterReturn }) {
  return <div className="flex h-10 items-center gap-2"><input aria-label={ariaLabel} type="number" inputMode="decimal" step="0.1" className="min-w-0 flex-1 bg-transparent text-base font-semibold tabular outline-none" {...registration} /><span className="text-[10px] font-semibold tracking-[.08em] text-[var(--dialed-text-muted)] uppercase">{unit}</span></div>;
}

export function GrindControl({ value, registration, onStep }: { value: string | null; registration: UseFormRegisterReturn; onStep: (delta: number) => void }) {
  return <div className="grid grid-cols-[36px_1fr_36px] items-center gap-1">
    <button type="button" aria-label="Mahlgrad verringern" title="Mahlgrad verringern" onClick={() => onStep(-0.1)} className="grid size-9 place-items-center border border-black bg-white hover:bg-black hover:text-white"><Minus className="size-3.5" /></button>
    <input aria-label="Mahlgrad" value={value ?? ""} className="min-w-0 bg-transparent text-center text-base font-semibold tabular outline-none" {...registration} />
    <button type="button" aria-label="Mahlgrad erhöhen" title="Mahlgrad erhöhen" onClick={() => onStep(0.1)} className="grid size-9 place-items-center border border-black bg-white hover:bg-black hover:text-white"><Plus className="size-3.5" /></button>
  </div>;
}

const emptyEquipmentValue = "__dialed_none__";

export function BeanSelectControl({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string;
  options: Bean[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const selected = options.find((item) => item.id === value) ?? null;
  return <Select value={selected?.id ?? null} onValueChange={(next) => typeof next === "string" && onValueChange(next)}>
    <SelectTrigger aria-label={label} className="h-10 w-full border-0 bg-transparent p-0 font-bold shadow-none focus-visible:ring-0">
      <SelectValue>{() => selected ? <span className="flex min-w-0 items-center gap-2"><EntityIconFrame><BeanIcon origin={selected.origin} /></EntityIconFrame><span className="truncate">{selected.name}</span></span> : <span className="text-[var(--dialed-text-muted)]">Bohne wählen</span>}</SelectValue>
    </SelectTrigger>
    <SelectContent align="start" className="min-w-[260px] p-1">
      {options.map((item) => <SelectItem key={item.id} value={item.id} className="min-h-12 py-2">
        <EntityIconFrame><BeanIcon origin={item.origin} /></EntityIconFrame>
        <span className="min-w-0 flex-1"><strong className="block truncate text-xs">{item.name}</strong><small className="mt-0.5 block truncate text-[9px] text-[var(--dialed-text-muted)]">{item.roaster}{item.origin ? ` · ${item.origin}` : ""}</small></span>
      </SelectItem>)}
    </SelectContent>
  </Select>;
}

export function SelectControl({
  label,
  options,
  value,
  onValueChange,
  equipmentType,
  fallback = "Nicht gewählt",
}: {
  label: string;
  options: Equipment[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  equipmentType: EquipmentType;
  fallback?: string;
}) {
  const selected = options.find((item) => item.id === value) ?? null;
  return <Select value={selected?.id ?? emptyEquipmentValue} onValueChange={(next) => onValueChange(next === emptyEquipmentValue || next === null ? null : String(next))}>
    <SelectTrigger aria-label={label} className="h-10 w-full border-0 bg-transparent p-0 font-bold shadow-none focus-visible:ring-0">
      <SelectValue>{() => <span className="flex min-w-0 items-center gap-2"><EntityIconFrame><EquipmentIcon type={selected?.type ?? equipmentType} /></EntityIconFrame><span className={`truncate ${selected ? "" : "text-[var(--dialed-text-muted)]"}`}>{selected?.name ?? fallback}</span></span>}</SelectValue>
    </SelectTrigger>
    <SelectContent align="start" className="min-w-[240px] p-1">
      <SelectItem value={emptyEquipmentValue} className="min-h-11 text-[var(--dialed-text-muted)]">{fallback}</SelectItem>
      {options.map((item) => <SelectItem key={item.id} value={item.id} className="min-h-12 py-2">
        <EntityIconFrame><EquipmentIcon type={item.type} /></EntityIconFrame>
        <span className="min-w-0 flex-1"><strong className="block truncate text-xs">{item.name}</strong><small className="mt-0.5 block text-[9px] text-[var(--dialed-text-muted)]">{item.type === "machine" ? "Maschine" : item.type === "grinder" ? "Mühle" : item.type === "basket" ? "Sieb" : "Tool"}</small></span>
      </SelectItem>)}
    </SelectContent>
  </Select>;
}

export function PrepToolsControl({ value, onToggle }: { value: string[]; onToggle: (tool: PrepTool) => void }) {
  return <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
    {PREP_TOOLS.map((tool) => {
      const active = value.includes(tool);
      return <button type="button" key={tool} aria-pressed={active} onClick={() => onToggle(tool)} className={`flex min-h-11 min-w-0 items-center gap-2 border px-2.5 text-left text-[10px] font-semibold tracking-[.06em] uppercase ${active ? "border-black bg-black text-white" : "border-[var(--crema-outline-soft)] bg-white text-[var(--dialed-text-secondary)] hover:border-black"}`}>
        {active ? <Check aria-hidden="true" className="size-3.5 shrink-0" /> : <Plus aria-hidden="true" className="size-3.5 shrink-0" />}
        <span className="min-w-0 truncate">{tool}</span>
      </button>;
    })}
  </div>;
}

export function SegmentedControl<T extends string>({ values, active, onSelect, columns = 3 }: { values: readonly (readonly [T, string, LucideIcon])[]; active: T | null; onSelect: (value: T) => void; columns?: number }) {
  return <div className="grid border border-black" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{values.map(([id, label, Icon]) => <button type="button" key={id} onClick={() => onSelect(id)} aria-pressed={active === id} className={`grid min-h-[72px] min-w-0 place-items-center content-center gap-1 border-r border-black px-1 py-2 text-center last:border-r-0 ${active === id ? "bg-black text-white" : "bg-white hover:bg-[var(--crema-surface-low)]"}`}><Icon className="size-4" /><span className="break-words text-[9px] font-semibold leading-3 tracking-[.04em] uppercase">{label}</span></button>)}</div>;
}
