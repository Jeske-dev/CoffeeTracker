import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BeanAttributeOption<T extends string> = {
  value: T | null;
  label: string;
  icon: LucideIcon;
};

export function BeanAttributePicker<T extends string>({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: T | null;
  options: readonly BeanAttributeOption<T>[];
  onValueChange: (value: T | null) => void;
}) {
  return <div role="group" aria-label={label} className="grid grid-cols-5 gap-1">
    {options.map((option) => {
      const selected = option.value === value;
      const Icon = option.icon;
      return <button
        key={option.value ?? "not-specified"}
        type="button"
        aria-label={`${label}: ${option.label}`}
        aria-pressed={selected}
        title={option.label}
        onClick={() => onValueChange(option.value)}
        className={cn(
          "grid min-h-[68px] min-w-0 place-items-center content-center gap-1 border px-0.5 py-2",
          selected
            ? "border-black bg-black text-white"
            : "border-[var(--crema-outline-soft)] bg-white text-[var(--dialed-text-muted)] hover:border-black hover:text-black",
        )}
      >
        <Icon aria-hidden="true" className="size-[18px]" />
        <span className="max-w-full break-words text-center text-[8px] font-semibold leading-[10px] uppercase">{option.label}</span>
      </button>;
    })}
  </div>;
}
