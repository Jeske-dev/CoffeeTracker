"use client";
/* React Hook Form intentionally manages mutable form state outside React Compiler memoization. */
/* eslint-disable react-hooks/incompatible-library */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeInfo, Bean as BeanGlyph, CalendarDays, Euro, Flame, MapPin, Package, ShoppingBag, Sparkles, Store, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { beanSchema, type BeanInput } from "@/lib/validation";
import { saveBean } from "@/features/data/actions";
import { usePrivateCache } from "@/hooks/use-private-cache";
import type { Bean } from "@/types/domain";

export function BeanForm({ userId, bean, archiveAction }: { userId: string; bean?: Bean; archiveAction?: React.ReactNode }) {
  const router = useRouter();
  const { invalidateBeanData } = usePrivateCache();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BeanInput>({
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

  return <form onSubmit={handleSubmit(submit)} className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
    <input type="hidden" {...register("tastingNotes")} />
    <div className="scrollbar-none min-h-0 overflow-y-auto px-[18px] py-5 pb-6">
      <div className="mx-auto max-w-[680px]">
        <div className="mb-5"><h2 className="font-display text-[25px]">Was landet in der Mühle?</h2><p className="mt-1.5 text-[11px] leading-4 text-[var(--dialed-text-muted)]">Die wichtigsten Angaben bleiben schnell erfassbar; Details sind optional.</p></div>

        <FormGroup title="Basisdaten" description="Woran erkennst du die Bohne?" icon={BeanGlyph}><div className="grid gap-4 sm:grid-cols-2"><Field label="Name der Bohne" icon={BeanGlyph} error={errors.name?.message}><Input {...register("name")} placeholder="z. B. La Esperanza" /></Field><Field label="Rösterei / Hersteller" icon={Store} error={errors.roaster?.message}><Input {...register("roaster")} placeholder="z. B. Hoppenworth & Ploch" /></Field></div></FormGroup>

        <FormGroup title="Röstung" description="Herkunft, Datum und Aufbereitung" icon={Flame}><div className="grid gap-4 sm:grid-cols-2"><Field label="Röstdatum" icon={CalendarDays} error={errors.roastDate?.message}><NativeDateInput label="Röstdatum" value={roastDate} registration={register("roastDate")} onClear={() => setValue("roastDate", "", { shouldValidate: true })} /></Field><Field label="Röstgrad" icon={Flame}><select className="h-10 w-full rounded-lg bg-[var(--dialed-surface-subtle)] px-3 text-xs" {...register("roastLevel", { setValueAs: (value) => value === "" ? null : value })}><option value="">Nicht angegeben</option><option value="light">Hell</option><option value="medium_light">Mittel-hell</option><option value="medium">Mittel</option><option value="dark">Dunkel</option></select></Field><Field label="Herkunft" icon={MapPin}><Input {...register("origin")} placeholder="Colombia" /></Field><Field label="Aufbereitung" icon={Sparkles}><select className="h-10 w-full rounded-lg bg-[var(--dialed-surface-subtle)] px-3 text-xs" {...register("process")}><option value="unknown">Nicht angegeben</option><option value="washed">Washed</option><option value="natural">Natural</option><option value="honey">Honey</option><option value="anaerobic">Anaerobic</option></select></Field></div></FormGroup>

        <FormGroup title="Einkauf" description="Optional für Kosten und Frische" icon={ShoppingBag}><div className="grid gap-4 sm:grid-cols-3"><Field label="Kaufdatum" icon={CalendarDays}><NativeDateInput label="Kaufdatum" value={purchaseDate} registration={register("purchaseDate")} onClear={() => setValue("purchaseDate", "")} /></Field><Field label="Packung" icon={Package}><Input type="number" step="0.1" placeholder="250 g" {...register("packageGrams", { setValueAs: (value) => value === "" ? null : Number(value) })} /></Field><Field label="Preis" icon={Euro}><Input type="number" step="0.01" placeholder="14,90 €" {...register("priceEuros", { setValueAs: (value) => value === "" ? null : Number(value) })} /></Field></div></FormGroup>

        <FormGroup title="Besonderheiten" icon={BadgeInfo}><label className="flex min-h-12 items-center justify-between rounded-[14px] bg-[var(--dialed-surface-subtle)] px-3 text-xs">Entkoffeiniert<Switch checked={decaf} onCheckedChange={(value) => setValue("isDecaf", value)} /></label>{archiveAction && <div className="mt-3 border-t pt-3">{archiveAction}</div>}</FormGroup>
      </div>
    </div>
    <footer className="z-10 flex gap-2 border-t bg-[rgba(251,248,243,.96)] px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(54,34,24,.05)] backdrop-blur"><Button type="button" variant="secondary" onClick={() => router.back()} className="h-12 flex-1 rounded-full">Abbrechen</Button><Button disabled={pending} type="submit" className="h-12 flex-1 rounded-full bg-[var(--dialed-crema)] text-[var(--dialed-text)]">{pending ? "Speichert …" : "Bohne speichern"}</Button></footer>
  </form>;
}

function FormGroup({ title, description, icon: Icon, children }: { title: string; description?: string; icon: LucideIcon; children: React.ReactNode }) { return <section className="mb-3 rounded-[24px] border bg-white p-4"><div className="mb-4 flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[var(--dialed-surface-subtle)] text-[var(--dialed-crema)]"><Icon className="size-4.5" /></span><span><h3 className="text-sm font-extrabold">{title}</h3>{description && <p className="mt-0.5 text-xs text-[var(--dialed-text-muted)]">{description}</p>}</span></div>{children}</section>; }
function Field({ label, icon: Icon, error, children }: { label: string; icon: LucideIcon; error?: string; children: React.ReactNode }) { return <div><Label className="mb-1.5 ml-1 flex items-center gap-1.5 text-xs text-[var(--dialed-text-muted)]"><Icon className="size-3.5" />{label}</Label>{children}{error && <p className="mt-1 text-xs text-[var(--dialed-rose)]">{error}</p>}</div>; }
function NativeDateInput({ label, value, registration, onClear }: { label: string; value: string; registration: UseFormRegisterReturn; onClear: () => void }) { return <div className="relative"><input type="date" aria-label={label} className="h-10 w-full cursor-pointer rounded-lg border bg-white px-2.5 pr-9 text-xs outline-none focus:border-[var(--dialed-crema)] focus:ring-2 focus:ring-[var(--dialed-crema-soft)]" onClick={(event) => event.currentTarget.showPicker?.()} {...registration} />{value && <button type="button" aria-label={`${label} löschen`} title="Nicht angegeben" onClick={onClear} className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-sm leading-none text-[var(--dialed-text-muted)] hover:bg-[var(--dialed-surface-subtle)] hover:text-[var(--dialed-text)]">×</button>}</div>; }
