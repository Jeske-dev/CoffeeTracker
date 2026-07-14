import { CircleHelp, CircleMinus, CirclePlus, Citrus, Coffee, Minus, Plus, Scale } from "lucide-react";
import { postStopDrip } from "@/lib/calculations";
import { formatRatio, formatWeight } from "@/lib/formatting";
import { tasteLevelFromShot, type TasteLevel } from "@/lib/taste-scale";
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

export function TasteBadge({ taste, className }: { taste: ShotTaste | null; className?: string }) {
  const option = tasteBadgeOptions.find((item) => item.value === taste);
  const Icon = option?.icon ?? CircleHelp;

  return <span className={cn(
    "inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold",
    option?.badge ?? "bg-[var(--dialed-surface-subtle)] text-[var(--dialed-text-muted)]",
    className,
  )}>
    <Icon aria-hidden="true" className="size-3.5" />
    {option?.label ?? "Offen"}
  </span>;
}

const tasteScaleOptions: Array<{
  value: TasteLevel;
  label: string;
  icon: typeof Scale;
  active: string;
}> = [
  { value: "too_sour", label: "Zu sauer", icon: CircleMinus, active: "border-[var(--dialed-gold)]/35 bg-[var(--dialed-gold)]/14 text-[#765B1B]" },
  { value: "slightly_sour", label: "Leicht sauer", icon: Minus, active: "border-[var(--dialed-gold)]/35 bg-[var(--dialed-gold)]/10 text-[#765B1B]" },
  { value: "balanced", label: "Ausgewogen", icon: Scale, active: "border-[var(--dialed-sage)]/35 bg-[var(--dialed-sage-soft)] text-[var(--dialed-sage)]" },
  { value: "slightly_bitter", label: "Leicht bitter", icon: Plus, active: "border-[var(--dialed-rose)]/25 bg-[var(--dialed-rose-soft)]/60 text-[var(--dialed-rose)]" },
  { value: "too_bitter", label: "Zu bitter", icon: CirclePlus, active: "border-[var(--dialed-rose)]/30 bg-[var(--dialed-rose-soft)] text-[var(--dialed-rose)]" },
];

export function TasteScale({ taste, rating }: { taste: ShotTaste | null; rating: number | null }) {
  const activeTaste = tasteLevelFromShot(taste, rating);
  const activeLabel = tasteScaleOptions.find((item) => item.value === activeTaste)?.label;
  return <div>
    <div className="grid grid-cols-5 gap-1" aria-label={`Geschmack: ${activeLabel ?? "nicht angegeben"}`}>
      {tasteScaleOptions.map((option) => {
        const Icon = option.icon;
        const active = option.value === activeTaste;
        return <div
          key={option.value}
          aria-current={active ? "true" : undefined}
          className={cn(
            "grid min-h-[72px] min-w-0 place-items-center content-center gap-1 rounded-[12px] border px-0.5 py-2 text-center font-bold",
            active ? option.active : "border-transparent bg-[var(--dialed-surface-subtle)] text-[var(--dialed-text-muted)]",
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
          <span className={`max-w-full break-words leading-3 min-[400px]:text-[10px] ${option.value === "balanced" ? "text-[8px]" : "text-[9px]"}`}>{option.label}</span>
        </div>;
      })}
    </div>
    {!activeTaste && <p className="mt-2 text-xs text-[var(--dialed-text-muted)]">Noch nicht eingeordnet</p>}
  </div>;
}

export function RatioVisual({ ratio, compact = false }: { ratio: number | null; compact?: boolean }) {
  const outputWidth = ratio === null ? 0 : Math.min(100, Math.max(0, ratio / 3 * 100));
  const inputWidth = 100 / 3;

  return <div className={cn("min-w-0", compact ? "w-full" : "rounded-[14px] bg-[var(--dialed-surface-subtle)] p-3")} aria-label={`Brew Ratio ${formatRatio(ratio)}`}>
    <div className="flex items-end justify-between gap-2">
      {!compact && <span className="text-xs font-medium text-[var(--dialed-text-muted)]">Brew Ratio</span>}
      <strong className={cn("whitespace-nowrap", compact ? "text-[13px]" : "font-display text-2xl font-medium")}>{formatRatio(ratio)}</strong>
    </div>
    <div className={cn("grid gap-1", compact ? "mt-1.5" : "mt-3")} aria-hidden="true">
      <span className="block h-1 rounded-full bg-[var(--dialed-surface-strong)]" style={{ width: `${inputWidth}%` }} />
      <span className="block h-1 rounded-full bg-[var(--dialed-crema)]" style={{ width: `${outputWidth}%` }} />
    </div>
  </div>;
}

export function YieldFlowGraphic({ stopWeight, finalWeight }: { stopWeight: number | null; finalWeight: number | null }) {
  const overshoot = postStopDrip(finalWeight, stopWeight);
  const maxWeight = Math.max(stopWeight ?? 0, finalWeight ?? 0, 1);
  const stopWidth = Math.min(100, Math.max(0, (stopWeight ?? 0) / maxWeight * 100));
  const finalWidth = Math.min(100, Math.max(0, (finalWeight ?? 0) / maxWeight * 100));
  const firstWidth = finalWeight === null ? stopWidth : Math.min(stopWidth, finalWidth);
  const afterStopWidth = Math.max(0, finalWidth - stopWidth);

  return <div className="rounded-[14px] bg-[var(--dialed-surface-subtle)] p-3.5" aria-label={`Gewichtsverlauf: Stop ${formatWeight(stopWeight)}, final ${formatWeight(finalWeight)}, Nachlauf ${formatWeight(overshoot)}`}>
    <div className="flex items-center justify-between gap-3">
      <strong className="text-sm">Gewichtsverlauf</strong>
      <span className="text-xs text-[var(--dialed-text-muted)]">Stop bis Tasse</span>
    </div>
    <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-black/[.06]" aria-hidden="true">
      <span className="absolute inset-y-0 left-0 bg-[var(--dialed-espresso)]" style={{ width: `${firstWidth}%` }} />
      <span className="absolute inset-y-0 bg-[var(--dialed-crema)]" style={{ left: `${stopWidth}%`, width: `${afterStopWidth}%` }} />
      {stopWeight !== null && <span className="absolute inset-y-[-3px] w-0.5 bg-white shadow-[0_0_0_1px_rgba(43,27,22,.2)]" style={{ left: `calc(${stopWidth}% - 1px)` }} />}
    </div>
    <div className="mt-3 grid grid-cols-3 gap-2">
      <WeightValue label="Stop" value={formatWeight(stopWeight)} />
      <WeightValue label="Final" value={formatWeight(finalWeight)} />
      <WeightValue label="Nachlauf" value={formatWeight(overshoot)} highlighted={overshoot !== null && overshoot > 0} />
    </div>
  </div>;
}

function WeightValue({ label, value, highlighted = false }: { label: string; value: string; highlighted?: boolean }) {
  return <div className="min-w-0">
    <span className="block text-xs text-[var(--dialed-text-muted)]">{label}</span>
    <strong className={cn("mt-1 block truncate text-sm", highlighted && "text-[var(--dialed-crema)]")}>{value}</strong>
  </div>;
}
