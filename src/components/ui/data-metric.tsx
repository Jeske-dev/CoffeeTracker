import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DataMetric({
  icon: Icon,
  label,
  value,
  align = "start",
  className,
  labelClassName,
  iconClassName,
  valueClassName,
  truncateValue = true,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  align?: "start" | "center";
  className?: string;
  labelClassName?: string;
  iconClassName?: string;
  valueClassName?: string;
  truncateValue?: boolean;
}) {
  const centered = align === "center";
  return <div className={cn("min-w-0", centered && "text-center", className)}>
    <span className={cn("flex items-center gap-1.5 text-[10px] font-semibold tracking-[.08em] text-[var(--dialed-text-muted)] uppercase", centered && "justify-center", labelClassName)}>
      {Icon && <Icon aria-hidden="true" className={cn("size-3.5", iconClassName)} />}
      {label}
    </span>
    <strong className={cn("mt-1.5 block text-sm font-semibold tabular", truncateValue && "truncate", valueClassName)}>{value}</strong>
  </div>;
}

export function LabeledValue({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0", className)}>
    <span className="mb-2 block text-[10px] font-semibold tracking-[.08em] text-[var(--dialed-text-muted)] uppercase">{label}</span>
    <div className="min-w-0 text-xs">{children}</div>
  </div>;
}
