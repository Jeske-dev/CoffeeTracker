import type { ReactNode } from "react";
import { CircleHelp, CircleStop, Citrus, Coffee, Minus, Plus, Scale } from "lucide-react";
import { DataMetric } from "@/components/ui/data-metric";
import { postStopDrip } from "@/lib/calculations";
import { formatWeight } from "@/lib/formatting";
import { TASTE_LEVELS, TASTE_LEVEL_VALUES, tasteLevelFromShot, type TasteLevel } from "@/lib/taste-scale";
import { cn } from "@/lib/utils";
import type { ShotTaste } from "@/types/domain";

const tasteBadgeOptions = [
  {
    value: "sour" as const,
    label: "Sauer",
    icon: Citrus,
    badge: "border border-black bg-white text-black",
  },
  {
    value: "balanced" as const,
    label: "Ausgewogen",
    icon: Scale,
    badge: "border border-black bg-black text-white",
  },
  {
    value: "bitter" as const,
    label: "Bitter",
    icon: Coffee,
    badge: "border border-black bg-[#525252] text-white",
  },
] as const;

export function TasteBadge({ taste, className, iconOnly = false }: { taste: ShotTaste | null; className?: string; iconOnly?: boolean }) {
  const option = tasteBadgeOptions.find((item) => item.value === taste);
  const Icon = option?.icon ?? CircleHelp;
  const label = option?.label ?? "Offen";

  return <span className={cn(
    "inline-flex min-h-7 shrink-0 items-center gap-1.5 text-xs font-bold",
    iconOnly ? "size-7 justify-center p-0" : "px-2.5 py-1 text-[10px] tracking-[.08em] uppercase",
    option?.badge ?? "border bg-[var(--dialed-surface-subtle)] text-[var(--dialed-text-muted)]",
    className,
  )} aria-label={iconOnly ? `Geschmack: ${label}` : undefined} title={iconOnly ? label : undefined}>
    <Icon aria-hidden="true" className="size-3.5" />
    {!iconOnly && label}
  </span>;
}

const tasteScalePresentation: Record<TasteLevel, { icon: typeof Scale; active: string }> = {
  too_sour: { icon: Citrus, active: "border-black bg-[var(--crema-surface-high)] text-black" },
  slightly_sour: { icon: Minus, active: "border-black bg-[var(--crema-surface-mid)] text-black" },
  balanced: { icon: Scale, active: "border-black bg-black text-white" },
  slightly_bitter: { icon: Plus, active: "border-black bg-[#757575] text-white" },
  too_bitter: { icon: Coffee, active: "border-black bg-[#1a1c1c] text-white" },
};

export function TasteScale({
  taste,
  rating,
  onChange,
}: {
  taste: ShotTaste | null;
  rating: number | null;
  onChange?: (taste: ShotTaste | null, rating: number | null) => void;
}) {
  const activeTaste = tasteLevelFromShot(taste, rating);
  const activeLabel = activeTaste ? TASTE_LEVEL_VALUES[activeTaste].label : null;
  return <div>
    <div className="grid grid-cols-5 gap-1" aria-label={`Geschmack: ${activeLabel ?? "nicht angegeben"}`}>
      {TASTE_LEVELS.map((level) => <TasteOption key={level} level={level} selected={level === activeTaste} onSelect={onChange} />)}
    </div>
    <div aria-hidden="true" className="mt-2 flex items-center justify-between gap-3 text-[10px] font-semibold tracking-[.08em] text-[var(--dialed-text-secondary)] uppercase">
      <span>Zu sauer</span>
      <span>Zu bitter</span>
    </div>
  </div>;
}

function TasteOption({ level, selected, onSelect }: { level: TasteLevel; selected: boolean; onSelect?: (taste: ShotTaste | null, rating: number | null) => void }) {
  const { label, taste, rating } = TASTE_LEVEL_VALUES[level];
  const { icon: Icon, active } = tasteScalePresentation[level];
  const className = cn(
    "grid min-h-14 min-w-0 place-items-center border p-2",
    selected ? active : "border-[var(--crema-outline-soft)] bg-white text-[var(--dialed-text-muted)]",
  );
  const content = <Icon aria-hidden="true" className="size-[18px]" />;

  if (onSelect) {
    return <button type="button" aria-label={label} title={label} aria-pressed={selected} onClick={() => onSelect(selected ? null : taste, selected ? null : rating)} className={className}>{content}</button>;
  }
  return <div title={label} aria-current={selected ? "true" : undefined} className={className}>{content}</div>;
}

export function YieldFlowGraphic({ stopWeight, finalWeight }: { stopWeight: number | null; finalWeight: number | null }) {
  const overshoot = postStopDrip(finalWeight, stopWeight);

  return <div className="border bg-[var(--dialed-surface-subtle)] p-4" aria-label={`Gewichtsverlauf: Stop ${formatWeight(stopWeight)}, final ${formatWeight(finalWeight)}, Nachlauf ${formatWeight(overshoot)}`}>
    <div className="flex items-center justify-between gap-3">
      <strong className="text-sm">Gewichtsverlauf</strong>
      <span className="text-xs text-[var(--dialed-text-muted)]">Stop bis Tasse</span>
    </div>
    <YieldBar stopWeight={stopWeight} finalWeight={finalWeight} />
    <div className="mt-3 grid grid-cols-3 gap-2">
      <WeightValue label="Stop" value={formatWeight(stopWeight)} />
      <WeightValue label="Final" value={formatWeight(finalWeight)} />
      <WeightValue label="Nachlauf" value={formatWeight(overshoot)} highlighted={overshoot !== null && overshoot > 0} />
    </div>
  </div>;
}

export function YieldInputGraphic({
  stopWeight,
  finalWeight,
  stopControl,
  finalControl,
}: {
  stopWeight: number | null;
  finalWeight: number | null;
  stopControl: ReactNode;
  finalControl: ReactNode;
}) {
  const overshoot = postStopDrip(finalWeight, stopWeight);

  return <div aria-label={`Gewichtsverlauf: Stop ${formatWeight(stopWeight)}, final ${formatWeight(finalWeight)}, Nachlauf ${formatWeight(overshoot)}`}>
    <div className="flex items-center justify-between gap-3">
      <strong className="text-sm">Gewichtsverlauf</strong>
      <span className="text-xs text-[var(--dialed-text-muted)]">Stop bis Tasse</span>
    </div>
    <YieldBar stopWeight={stopWeight} finalWeight={finalWeight} />
    <div className="mt-3 grid grid-cols-2 gap-2">
      <WeightControl label="Stop-Gewicht" icon={<CircleStop aria-hidden="true" className="size-3.5" />} control={stopControl} />
      <WeightControl label="Finales Gewicht" icon={<Coffee aria-hidden="true" className="size-3.5" />} control={finalControl} />
    </div>
    <output aria-label="Berechneter Nachlauf" className="mt-2 flex min-h-10 items-center justify-between gap-3 border bg-[var(--dialed-surface-subtle)] px-3 text-xs">
      <span className="text-[var(--dialed-text-muted)]">Nachlauf</span>
      <strong>{formatWeight(overshoot)}</strong>
    </output>
  </div>;
}

function YieldBar({ stopWeight, finalWeight }: { stopWeight: number | null; finalWeight: number | null }) {
  const maxWeight = Math.max(stopWeight ?? 0, finalWeight ?? 0, 1);
  const stopWidth = Math.min(100, Math.max(0, (stopWeight ?? 0) / maxWeight * 100));
  const finalWidth = Math.min(100, Math.max(0, (finalWeight ?? 0) / maxWeight * 100));
  const firstWidth = finalWeight === null ? stopWidth : Math.min(stopWidth, finalWidth);
  const afterStopWidth = Math.max(0, finalWidth - stopWidth);

  return <div className="relative mt-4 h-3 overflow-hidden border border-black bg-[var(--crema-surface-high)]" aria-hidden="true">
    <span className="absolute inset-y-0 left-0 bg-[var(--dialed-espresso)]" style={{ width: `${firstWidth}%` }} />
    <span className="absolute inset-y-0 bg-[#757575]" style={{ left: `${stopWidth}%`, width: `${afterStopWidth}%` }} />
    {stopWeight !== null && <span className="absolute inset-y-[-3px] w-0.5 bg-white" style={{ left: `calc(${stopWidth}% - 1px)` }} />}
  </div>;
}

function WeightControl({ label, icon, control }: { label: string; icon: ReactNode; control: ReactNode }) {
  return <div className="min-w-0 border bg-white px-3 py-2.5">
    <small className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--dialed-text-muted)]">{icon}{label}</small>
    <div className="min-w-0">{control}</div>
  </div>;
}

function WeightValue({ label, value, highlighted = false }: { label: string; value: string; highlighted?: boolean }) {
  return <DataMetric label={label} value={value} valueClassName={cn("mt-1 text-sm", highlighted && "font-bold text-black")} />;
}
