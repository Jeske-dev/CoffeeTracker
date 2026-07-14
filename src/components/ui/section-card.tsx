import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const iconToneClasses = {
  neutral: "border-[var(--crema-outline-soft)] bg-white text-black",
  crema: "border-black bg-black text-white",
  sage: "border-black bg-[var(--crema-surface-mid)] text-black",
  rose: "border-[var(--crema-error)] bg-[var(--crema-error-soft)] text-[var(--crema-error)]",
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
  return <section className={cn("rounded-none border bg-white p-5", className)}>
    <header className="mb-5 flex min-h-10 items-center gap-3 border-b border-black pb-4">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-none border", iconToneClasses[tone])}>
        <Icon aria-hidden="true" className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[18px] font-semibold leading-tight">{title}</h2>
        {description && <p className="mt-1 text-xs leading-4 text-[var(--dialed-text-muted)]">{description}</p>}
      </div>
      {action}
    </header>
    <div className={bodyClassName}>{children}</div>
  </section>;
}
