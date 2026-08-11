"use client";
/* React Hook Form intentionally manages mutable form state outside React Compiler memoization. */
/* eslint-disable react-hooks/incompatible-library */

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeInfo,
  Bean as BeanGlyph,
  CalendarDays,
  Check,
  CircleDot,
  CircleHelp,
  Euro,
  Flame,
  FlaskConical,
  Hexagon,
  LoaderCircle,
  MapPin,
  Moon,
  Package,
  ShoppingBag,
  Sparkles,
  Store,
  Sun,
  SunMedium,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { BeanAttributePicker, type BeanAttributeOption } from "@/components/beans/bean-attribute-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section-card";
import { Switch } from "@/components/ui/switch";
import { beanSchema, type BeanInput } from "@/lib/validation";
import { saveBean } from "@/features/data/actions";
import { usePrivateCache } from "@/hooks/use-private-cache";
import type { Bean, BeanProcess, RoastLevel } from "@/types/domain";

const roastLevelOptions = [
  { value: null, label: "Offen", icon: CircleHelp },
  { value: "light", label: "Hell", icon: Sun },
  { value: "medium_light", label: "Mittel-hell", icon: SunMedium },
  { value: "medium", label: "Mittel", icon: CircleDot },
  { value: "dark", label: "Dunkel", icon: Moon },
] satisfies readonly BeanAttributeOption<RoastLevel>[];

const processOptions = [
  { value: "unknown", label: "Offen", icon: CircleHelp },
  { value: "washed", label: "Washed", icon: Waves },
  { value: "natural", label: "Natural", icon: Sun },
  { value: "honey", label: "Honey", icon: Hexagon },
  { value: "anaerobic", label: "Anaerob", icon: FlaskConical },
] satisfies readonly BeanAttributeOption<BeanProcess>[];

const optionalNumberRegistration = {
  setValueAs: (value: unknown) => value === "" || value === null || value === undefined ? null : Number(value),
};

export function BeanForm({ userId, bean, archiveAction }: { userId: string; bean?: Bean; archiveAction?: React.ReactNode }) {
  const router = useRouter();
  const creating = !bean;
  const { invalidateBeanData } = usePrivateCache();
  const [pending, startTransition] = useTransition();
  const { control, register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BeanInput>({
    resolver: zodResolver(beanSchema),
    defaultValues: bean ? {
      id: bean.id,
      name: bean.name,
      roaster: bean.roaster,
      roastDate: bean.roast_date ?? "",
      origin: bean.origin ?? "",
      process: bean.process,
      roastLevel: bean.roast_level,
      tastingNotes: bean.tasting_notes.join(", "),
      purchaseDate: bean.purchase_date ?? "",
      priceEuros: bean.price_cents === null ? null : bean.price_cents / 100,
      packageGrams: bean.package_grams,
      isDecaf: bean.is_decaf,
    } : {
      name: "",
      roaster: "",
      roastDate: new Date().toISOString().slice(0, 10),
      origin: "",
      process: "unknown",
      roastLevel: null,
      tastingNotes: "",
      purchaseDate: "",
      priceEuros: null,
      packageGrams: null,
      isDecaf: false,
    },
  });
  const decaf = watch("isDecaf");
  const roastDate = watch("roastDate");
  const purchaseDate = watch("purchaseDate") ?? "";

  const submit = (data: BeanInput) => startTransition(async () => {
    const result = await saveBean(data);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    await invalidateBeanData({ userId, beanId: result.id, touchesDashboard: true });
    toast.success(result.message);
    router.push("/app/beans");
  });

  return <form
    id="bean-form"
    onSubmit={handleSubmit(submit)}
    aria-busy={pending}
    className={creating
      ? "fixed inset-0 z-50 grid h-dvh max-h-dvh grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[var(--dialed-surface)] min-[561px]:absolute min-[561px]:h-full"
      : "grid h-full min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden"}
  >
    {creating && <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 border-b border-black bg-white px-6 pt-[calc(16px+env(safe-area-inset-top))] pb-4">
      <Link href="/app/beans" aria-label="Schließen" title="Schließen" className="grid size-11 place-items-center border border-black bg-white hover:bg-black hover:text-white"><X className="size-4" /></Link>
      <h1 className="truncate text-center font-display text-[22px] font-semibold">Neue Bohne</h1>
      <Button type="submit" size="icon-lg" disabled={pending} aria-label={pending ? "Bohne wird gespeichert" : "Bohne speichern"} title="Bohne speichern">
        {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
      </Button>
    </header>}
    <input type="hidden" {...register("tastingNotes")} />
    <div className="form-scroll-region px-6 py-6 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-[680px]">
        <div className="mb-6"><h2 className="font-display text-[26px] font-semibold leading-tight">Was landet in der Mühle?</h2><p className="mt-2 text-xs leading-5 text-[var(--dialed-text-muted)]">Die wichtigsten Angaben bleiben schnell erfassbar; Details sind optional.</p></div>

        <SectionCard title="Basisdaten" description="Woran erkennst du die Bohne?" icon={BeanGlyph} className="mb-3"><div className="grid gap-4 sm:grid-cols-2"><Field label="Name der Bohne" icon={BeanGlyph} error={errors.name?.message}><Input aria-label="Name der Bohne" {...register("name")} placeholder="z. B. La Esperanza" /></Field><Field label="Rösterei / Hersteller" icon={Store} error={errors.roaster?.message}><Input aria-label="Rösterei / Hersteller" {...register("roaster")} placeholder="z. B. Hoppenworth & Ploch" /></Field></div></SectionCard>

        <SectionCard title="Röstung" description="Datum und Röstprofil" icon={Flame} className="mb-3">
          <div className="grid gap-5">
            <Field label="Röstdatum" icon={CalendarDays} error={errors.roastDate?.message}><NativeDateInput label="Röstdatum" value={roastDate} registration={register("roastDate")} onClear={() => setValue("roastDate", "", { shouldValidate: true })} /></Field>
            <Field label="Röstgrad" icon={Flame}><Controller control={control} name="roastLevel" render={({ field }) => <BeanAttributePicker label="Röstgrad" value={field.value} options={roastLevelOptions} onValueChange={field.onChange} />} /></Field>
          </div>
        </SectionCard>

        <SectionCard title="Herkunft & Aufbereitung" description="Ursprung und Verarbeitung" icon={MapPin} className="mb-3">
          <div className="grid gap-5">
            <Field label="Herkunft" icon={MapPin}><Input aria-label="Herkunft" {...register("origin")} placeholder="z. B. Kolumbien" /></Field>
            <Field label="Aufbereitung" icon={Sparkles}><Controller control={control} name="process" render={({ field }) => <BeanAttributePicker label="Aufbereitung" value={field.value} options={processOptions} onValueChange={field.onChange} />} /></Field>
          </div>
        </SectionCard>

        <SectionCard title="Einkauf" description="Optional für Kosten und Frische" icon={ShoppingBag} className="mb-3"><div className="grid gap-4 sm:grid-cols-3"><Field label="Kaufdatum" icon={CalendarDays}><NativeDateInput label="Kaufdatum" value={purchaseDate} registration={register("purchaseDate")} onClear={() => setValue("purchaseDate", "")} /></Field><Field label="Packung" icon={Package}><Input aria-label="Packungsgewicht" type="number" step="0.1" placeholder="250 g" {...register("packageGrams", optionalNumberRegistration)} /></Field><Field label="Preis" icon={Euro}><Input aria-label="Preis" type="number" step="0.01" placeholder="14,90 €" {...register("priceEuros", optionalNumberRegistration)} /></Field></div></SectionCard>

        <SectionCard title="Besonderheiten" icon={BadgeInfo} className="mb-3"><label className="flex min-h-12 items-center justify-between border bg-[var(--dialed-surface-subtle)] px-3 text-xs font-semibold">Entkoffeiniert<Switch checked={decaf} onCheckedChange={(value) => setValue("isDecaf", value)} /></label>{archiveAction && <div className="mt-4 border-t pt-4">{archiveAction}</div>}</SectionCard>
        <div aria-hidden="true" data-form-end-spacer className="h-20" />
      </div>
    </div>
  </form>;
}

function Field({ label, icon: Icon, error, children }: { label: string; icon: LucideIcon; error?: string; children: React.ReactNode }) { return <div><Label className="mb-2 flex items-center gap-1.5 text-[10px] text-[var(--dialed-text-muted)]"><Icon className="size-3.5" />{label}</Label>{children}{error && <p className="mt-1 text-xs text-[var(--dialed-rose)]">{error}</p>}</div>; }
function NativeDateInput({ label, value, registration, onClear }: { label: string; value: string; registration: UseFormRegisterReturn; onClear: () => void }) { return <div className="relative"><input type="date" aria-label={label} className="h-11 w-full cursor-pointer border-0 border-b bg-transparent px-0 pr-9 text-sm outline-none focus:border-b-2 focus:border-black" {...registration} />{value && <button type="button" aria-label={`${label} löschen`} title="Nicht angegeben" onClick={onClear} className="absolute top-1/2 right-0 grid size-8 -translate-y-1/2 place-items-center border-l text-sm leading-none text-[var(--dialed-text-muted)] hover:bg-black hover:text-white">×</button>}</div>; }
