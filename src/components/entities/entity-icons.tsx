import { CircleDot, Coffee, Settings2, Sprout, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { flagForOrigin } from "@/lib/country-flags";
import type { Bean, Equipment, EquipmentType } from "@/types/domain";

const equipmentIcons: Record<EquipmentType, LucideIcon> = {
  machine: Coffee,
  grinder: Settings2,
  basket: CircleDot,
  tool: Wrench,
};

const frameSizes = {
  sm: "size-7 rounded-[9px]",
  md: "size-9 rounded-[11px]",
  lg: "size-[46px] rounded-[15px]",
} as const;

export function EntityIconFrame({
  children,
  size = "sm",
  className,
}: {
  children: React.ReactNode;
  size?: keyof typeof frameSizes;
  className?: string;
}) {
  return <span className={cn("grid shrink-0 place-items-center bg-[var(--dialed-surface-subtle)] text-[var(--dialed-crema)]", frameSizes[size], className)}>{children}</span>;
}

export function BeanIcon({ origin, className }: { origin?: string | null; className?: string }) {
  const flag = flagForOrigin(origin);
  if (flag) {
    return <span role="img" aria-label={`Flagge ${origin}`} data-entity-icon="bean-flag" className={cn("inline-grid place-items-center text-[18px] leading-none", className)}>{flag}</span>;
  }
  return <span role="img" aria-label="Bohne" data-entity-icon="bean" className={cn("inline-grid place-items-center [&_svg]:size-4", className)}><Sprout aria-hidden="true" /></span>;
}

export function EquipmentIcon({ type, className }: { type: EquipmentType; className?: string }) {
  const Icon = equipmentIcons[type];
  return <span aria-hidden="true" data-entity-icon={type} className={cn("inline-grid place-items-center [&_svg]:size-4", className)}><Icon /></span>;
}

export function BeanIdentity({
  bean,
  fallback = "Nicht gewählt",
}: {
  bean: Pick<Bean, "name" | "origin"> | null | undefined;
  fallback?: string;
}) {
  return <span className="flex min-w-0 items-center gap-2">
    <EntityIconFrame><BeanIcon origin={bean?.origin} /></EntityIconFrame>
    <span className="truncate font-bold">{bean?.name ?? fallback}</span>
  </span>;
}

export function EquipmentIdentity({
  equipment,
  type,
  fallback = "Nicht gewählt",
}: {
  equipment: Pick<Equipment, "name" | "type"> | null | undefined;
  type: EquipmentType;
  fallback?: string;
}) {
  return <span className="flex min-w-0 items-center gap-2">
    <EntityIconFrame><EquipmentIcon type={equipment?.type ?? type} /></EntityIconFrame>
    <span className="truncate font-bold">{equipment?.name ?? fallback}</span>
  </span>;
}
