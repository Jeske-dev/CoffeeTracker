import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const iconToneClasses = {
  neutral: "bg-[var(--dialed-surface-subtle)] text-[var(--dialed-crema)]",
  crema: "bg-[var(--dialed-crema-soft)] text-[var(--dialed-crema)]",
  sage: "bg-[var(--dialed-sage-soft)] text-[var(--dialed-sage)]",
  rose: "bg-[var(--dialed-rose-soft)] text-[var(--dialed-rose)]",
} as const;

export function SectionCard({
  title,
  description,
  icon: Icon,
  tone = "neutral",
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  tone?: keyof typeof iconToneClasses;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return <section className={cn("rounded-[24px] border bg-white p-4 shadow-[var(--shadow-sm)]", className)}>
    <header className="mb-3 flex min-h-10 items-center gap-3">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-[13px]", iconToneClasses[tone])}>
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-extrabold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-[var(--dialed-text-muted)]">{description}</p>}
      </div>
      {action}
    </header>
    <div className={bodyClassName}>{children}</div>
  </section>;
}
