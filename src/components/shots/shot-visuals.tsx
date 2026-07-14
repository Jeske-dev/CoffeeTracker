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
    badge: "bg-[var(--dialed-gold)]/14 text-[#876A22]",
    active: "border-[var(--dialed-gold)]/35 bg-[var(--dialed-gold)]/14 text-[#765B1B]",
  },
  {
    value: "balanced" as const,
    label: "Ausgewogen",
    icon: Scale,
    badge: "bg-[var(--dialed-sage-soft)] text-[var(--dialed-sage)]",
    active: "border-[var(--dialed-sage)]/35 bg-[var(--dialed-sage-soft)] text-[var(--dialed-sage)]",
  },
  {
    value: "bitter" as const,
    label: "Bitter",
    icon: Coffee,
    badge: "bg-[var(--dialed-rose-soft)] text-[var(--dialed-rose)]",
    active: "border-[var(--dialed-rose)]/30 bg-[var(--dialed-rose-soft)] text-[var(--dialed-rose)]",
  },
] as const;

export function TasteBadge({ taste, className, iconOnly = false }: { taste: ShotTaste | null; className?: string; iconOnly?: boolean }) {
  const option = tasteBadgeOptions.find((item) => item.value === taste);
  const Icon = option?.icon ?? CircleHelp;
  const label = option?.label ?? "Offen";

  return <span className={cn(
    "inline-flex min-h-7 shrink-0 items-center gap-1.5 text-xs font-bold",
    iconOnly ? "size-7 justify-center rounded-[9px] p-0" : "rounded-full px-2.5",
    option?.badge ?? "bg-[var(--dialed-surface-subtle)] text-[var(--dialed-text-muted)]",
    className,
  )} aria-label={iconOnly ? `Geschmack: ${label}` : undefined} title={iconOnly ? label : undefined}>
    <Icon aria-hidden="true" className="size-3.5" />
    {!iconOnly && label}
  </span>;
}

const tasteScalePresentation: Record<TasteLevel, { icon: typeof Scale; active: string }> = {
  too_sour: { icon: Citrus, active: "border-[var(--dialed-gold)]/35 bg-[var(--dialed-gold)]/14 text-[#765B1B]" },
  slightly_sour: { icon: Minus, active: "border-[var(--dialed-gold)]/35 bg-[var(--dialed-gold)]/10 text-[#765B1B]" },
  balanced: { icon: Scale, active: "border-[var(--dialed-sage)]/35 bg-[var(--dialed-sage-soft)] text-[var(--dialed-sage)]" },
  slightly_bitter: { icon: Plus, active: "border-[var(--dialed-rose)]/25 bg-[var(--dialed-rose-soft)]/60 text-[var(--dialed-rose)]" },
  too_bitter: { icon: Coffee, active: "border-[var(--dialed-rose)]/30 bg-[var(--dialed-rose-soft)] text-[var(--dialed-rose)]" },
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
    <div aria-hidden="true" className="mt-2 flex items-center justify-between gap-3 text-[10px] font-bold">
      <span className="text-[#765B1B]">Zu sauer</span>
      <span className="text-[var(--dialed-rose)]">Zu bitter</span>
    </div>
  </div>;
}

function TasteOption({ level, selected, onSelect }: { level: TasteLevel; selected: boolean; onSelect?: (taste: ShotTaste | null, rating: number | null) => void }) {
  const { label, taste, rating } = TASTE_LEVEL_VALUES[level];
  const { icon: Icon, active } = tasteScalePresentation[level];
  const className = cn(
    "grid min-h-14 min-w-0 place-items-center rounded-[10px] border p-2",
    selected ? active : "border-transparent bg-[var(--dialed-surface-subtle)] text-[var(--dialed-text-muted)]",
  );
  const content = <Icon aria-hidden="true" className="size-[18px]" />;

  if (onSelect) {
    return <button type="button" aria-label={label} title={label} aria-pressed={selected} onClick={() => onSelect(selected ? null : taste, selected ? null : rating)} className={className}>{content}</button>;
  }
  return <div title={label} aria-current={selected ? "true" : undefined} className={className}>{content}</div>;
}

export function YieldFlowGraphic({ stopWeight, finalWeight }: { stopWeight: number | null; finalWeight: number | null }) {
  const overshoot = postStopDrip(finalWeight, stopWeight);

  return <div className="rounded-[14px] bg-[var(--dialed-surface-subtle)] p-3.5" aria-label={`Gewichtsverlauf: Stop ${formatWeight(stopWeight)}, final ${formatWeight(finalWeight)}, Nachlauf ${formatWeight(overshoot)}`}>
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
    <output aria-label="Berechneter Nachlauf" className="mt-2 flex min-h-9 items-center justify-between gap-3 rounded-[10px] bg-[var(--dialed-surface-subtle)] px-3 text-xs">
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

  return <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-black/[.06]" aria-hidden="true">
    <span className="absolute inset-y-0 left-0 bg-[var(--dialed-espresso)]" style={{ width: `${firstWidth}%` }} />
    <span className="absolute inset-y-0 bg-[var(--dialed-crema)]" style={{ left: `${stopWidth}%`, width: `${afterStopWidth}%` }} />
    {stopWeight !== null && <span className="absolute inset-y-[-3px] w-0.5 bg-white shadow-[0_0_0_1px_rgba(43,27,22,.2)]" style={{ left: `calc(${stopWidth}% - 1px)` }} />}
  </div>;
}

function WeightControl({ label, icon, control }: { label: string; icon: ReactNode; control: ReactNode }) {
  return <div className="min-w-0 rounded-[12px] border bg-white px-3 py-2.5">
    <small className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--dialed-text-muted)]">{icon}{label}</small>
    <div className="min-w-0">{control}</div>
  </div>;
}

function WeightValue({ label, value, highlighted = false }: { label: string; value: string; highlighted?: boolean }) {
  return <DataMetric label={label} value={value} valueClassName={cn("mt-1 text-sm", highlighted && "text-[var(--dialed-crema)]")} />;
}
