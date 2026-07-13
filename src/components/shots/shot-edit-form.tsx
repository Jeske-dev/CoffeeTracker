"use client";
/* React Hook Form intentionally manages mutable form state outside React Compiler memoization. */
/* eslint-disable react-hooks/incompatible-library */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateDialedScore } from "@/lib/calculations";
import { formatRatio } from "@/lib/formatting";
import { shotEditSchema, type ShotEditInput } from "@/lib/validation";
import { updateShot } from "@/features/data/actions";
import type { Bean, Equipment, Shot } from "@/types/domain";

const toLocalDateTime = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function ShotEditForm({ shot, beans, equipment }: { shot: Shot; beans: Bean[]; equipment: Equipment[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const machines = equipment.filter((item) => item.type === "machine" && !item.archived_at);
  const grinders = equipment.filter((item) => item.type === "grinder" && !item.archived_at);
  const baskets = equipment.filter((item) => item.type === "basket" && !item.archived_at);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ShotEditInput>({
    resolver: zodResolver(shotEditSchema),
    defaultValues: {
      shotAt: toLocalDateTime(shot.shot_at),
      beanId: shot.bean_id,
      machineId: shot.machine_id,
      grinderId: shot.grinder_id,
      basketId: shot.basket_id,
      grindSetting: shot.grind_setting,
      doseGrams: shot.dose_grams,
      temperatureC: shot.temperature_c,
      preinfusionSeconds: shot.preinfusion_seconds,
      prepTools: shot.prep_tools,
      extractionSeconds: shot.extraction_seconds,
      stopWeightGrams: shot.stop_weight_grams,
      finalYieldGrams: shot.final_yield_grams,
      taste: shot.taste,
      flow: shot.flow,
      puck: shot.puck,
      notes: shot.notes,
      overallTasteRating: shot.overall_taste_rating,
      tds: shot.tds,
      flowEvenness: shot.flow_evenness,
      channeling: shot.channeling,
    },
  });
  const values = watch();
  const scoreResult = calculateDialedScore({ doseGrams: values.doseGrams, finalYieldGrams: values.finalYieldGrams, extractionSeconds: values.extractionSeconds, overallTasteRating: values.overallTasteRating, tasteBalance: values.taste, flow: values.flow, puck: values.puck, flowEvenness: values.flowEvenness, channeling: values.channeling, tds: values.tds });
  const ratio = values.doseGrams && values.finalYieldGrams ? formatRatio(values.finalYieldGrams / values.doseGrams) : "—";

  const submit = (data: ShotEditInput) => startTransition(async () => {
    const result = await updateShot(shot.id, data);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Shot aktualisiert", { description: result.message });
    router.push(`/app/shots/${shot.id}`);
    router.refresh();
  });

  return <form onSubmit={handleSubmit(submit)} className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
    <div className="scrollbar-none min-h-0 overflow-y-auto px-[18px] py-5 pb-6">
      <div className="mx-auto max-w-[680px]">
        <div className="mb-5"><h2 className="font-display text-[25px]">Shot korrigieren</h2><p className="mt-1.5 text-[11px] leading-4 text-[var(--dialed-text-muted)]">Ändere gemessene Werte, Setup, Geschmack und Diagnose. Der Score wird beim Speichern neu berechnet.</p></div>

        <section className="mb-3 rounded-[24px] bg-[var(--dialed-espresso)] p-4 text-white">
          <div className="flex items-center justify-between gap-4">
            <div><small className="text-[9px] uppercase tracking-[.12em] text-white/60">Live-Vorschau</small><strong className="mt-1 block font-display text-[32px]">{scoreResult.score ?? "—"}</strong></div>
            <div className="text-right text-[10px] text-white/70"><strong className="block text-xs text-white">{ratio}</strong>Datenabdeckung {scoreResult.coverage}%<br />{scoreResult.coverageLabel}</div>
          </div>
        </section>

        <FormGroup title="Zeitpunkt & Setup"><div className="grid gap-4 sm:grid-cols-2"><Field label="Zeitpunkt" error={errors.shotAt?.message}><Input type="datetime-local" className="h-10 bg-white text-xs" {...register("shotAt")} /></Field><Field label="Bohne" error={errors.beanId?.message}><select className="h-10 w-full rounded-lg bg-[var(--dialed-surface-subtle)] px-3 text-xs" {...register("beanId")}>{beans.filter((bean) => !bean.archived_at || bean.id === shot.bean_id).map((bean) => <option key={bean.id} value={bean.id}>{bean.name} · {bean.roaster}</option>)}</select></Field><Field label="Maschine"><Select registration={register("machineId", nullableString)} options={machines} currentId={shot.machine_id} /></Field><Field label="Mühle"><Select registration={register("grinderId", nullableString)} options={grinders} currentId={shot.grinder_id} /></Field><Field label="Basket"><Select registration={register("basketId", nullableString)} options={baskets} currentId={shot.basket_id} /></Field><Field label="Mahlgrad" error={errors.grindSetting?.message}><Input className="h-10 bg-white text-xs" {...register("grindSetting", nullableString)} /></Field></div></FormGroup>

        <FormGroup title="Rezept & Extraktion"><div className="grid gap-4 sm:grid-cols-3"><NumberField label="Dosis" unit="g" error={errors.doseGrams?.message} registration={register("doseGrams", nullableNumber)} /><NumberField label="Temperatur" unit="C" error={errors.temperatureC?.message} registration={register("temperatureC", nullableNumber)} /><NumberField label="Preinfusion" unit="s" error={errors.preinfusionSeconds?.message} registration={register("preinfusionSeconds", nullableNumber)} /><NumberField label="Extraktionszeit" unit="s" error={errors.extractionSeconds?.message} registration={register("extractionSeconds", nullableNumber)} /><NumberField label="Stop-Gewicht" unit="g" error={errors.stopWeightGrams?.message} registration={register("stopWeightGrams", nullableNumber)} /><NumberField label="Finaler Yield" unit="g" error={errors.finalYieldGrams?.message} registration={register("finalYieldGrams", nullableNumber)} /></div></FormGroup>

        <FormGroup title="Puck Prep"><Field label="Tools"><Input className="h-10 bg-white text-xs" placeholder="WDT, Tamper, Puck Screen" value={(values.prepTools ?? []).join(", ")} onChange={(event) => setValue("prepTools", event.target.value.split(",").map((item) => item.trim()).filter(Boolean), { shouldValidate: true })} /></Field></FormGroup>

        <FormGroup title="Geschmack & Diagnose"><div className="grid gap-4 sm:grid-cols-2"><Field label="Geschmack"><select className="h-10 w-full rounded-lg bg-[var(--dialed-surface-subtle)] px-3 text-xs" {...register("taste", nullableString)}><option value="">Nicht angegeben</option><option value="very_sour">Sehr sauer</option><option value="sour">Leicht sauer</option><option value="balanced">Balanciert</option><option value="bitter">Leicht bitter</option><option value="very_bitter">Sehr bitter</option></select></Field><Field label="Taste Rating"><select className="h-10 w-full rounded-lg bg-[var(--dialed-surface-subtle)] px-3 text-xs" {...register("overallTasteRating", nullableNumber)}><option value="">Nicht angegeben</option><option value="1">1 · schwach</option><option value="2">2</option><option value="3">3 · ok</option><option value="4">4</option><option value="5">5 · sehr gut</option></select></Field><Field label="Flow"><select className="h-10 w-full rounded-lg bg-[var(--dialed-surface-subtle)] px-3 text-xs" {...register("flow", nullableString)}><option value="">Nicht angegeben</option><option value="even">Gleichmäßig</option><option value="minor_channeling">Leichtes Channeling</option><option value="channeling">Starkes Channeling</option><option value="spritzing">Spritzing</option></select></Field><Field label="Puck"><select className="h-10 w-full rounded-lg bg-[var(--dialed-surface-subtle)] px-3 text-xs" {...register("puck", nullableString)}><option value="">Nicht angegeben</option><option value="dry">Zu trocken</option><option value="ideal">Sauber & stabil</option><option value="wet">Sehr nass</option><option value="stuck">Hängengeblieben</option></select></Field><NumberField label="Flow-Evenness" unit="%" error={errors.flowEvenness?.message} registration={register("flowEvenness", nullableNumber)} /><NumberField label="TDS" unit="%" error={errors.tds?.message} registration={register("tds", nullableNumber)} /></div><div className="mt-4 grid grid-cols-3 gap-2">{[["", "Nicht bewertet"], ["false", "Kein Channeling"], ["true", "Channeling"]].map(([value, label]) => <button type="button" key={value} aria-pressed={String(values.channeling) === value || (value === "" && values.channeling === null)} onClick={() => setValue("channeling", value === "" ? null : value === "true", { shouldValidate: true })} className={`min-h-11 rounded-[14px] border px-2 text-[10px] font-bold ${String(values.channeling) === value || (value === "" && values.channeling === null) ? "border-[var(--dialed-sage)]/30 bg-[var(--dialed-sage-soft)] text-[var(--dialed-sage)]" : "bg-white"}`}>{label}</button>)}</div></FormGroup>

        <FormGroup title="Notiz"><Textarea className="min-h-28 bg-white text-xs" {...register("notes")} /></FormGroup>
      </div>
    </div>
    <footer className="z-10 flex gap-2 border-t bg-[rgba(251,248,243,.96)] px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(54,34,24,.05)] backdrop-blur"><Button type="button" variant="secondary" onClick={() => router.back()} className="h-12 flex-1 rounded-full">Abbrechen</Button><Button disabled={pending} type="submit" className="h-12 flex-1 rounded-full bg-[var(--dialed-crema)] text-[var(--dialed-text)]">{pending ? "Speichert ..." : "Shot speichern"}</Button></footer>
  </form>;
}

const nullableString = { setValueAs: (value: string) => value === "" ? null : value };
const nullableNumber = { setValueAs: (value: string) => value === "" ? null : Number(value) };

function FormGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mb-3 rounded-[24px] border bg-white p-4"><h3 className="mb-3 text-xs font-extrabold">{title}</h3>{children}</section>; }
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <div><Label className="mb-1.5 ml-1 block text-[9px] text-[var(--dialed-text-muted)]">{label}</Label>{children}{error && <p className="mt-1 text-[10px] text-[var(--dialed-rose)]">{error}</p>}</div>; }
function NumberField({ label, unit, error, registration }: { label: string; unit: string; error?: string; registration: UseFormRegisterReturn }) { return <Field label={label} error={error}><div className="flex h-10 items-center rounded-lg bg-[var(--dialed-surface-subtle)] px-3"><input type="number" step="0.1" className="w-full bg-transparent text-xs outline-none" {...registration} /><span className="text-[10px] text-[var(--dialed-text-muted)]">{unit}</span></div></Field>; }
function Select({ registration, options, currentId }: { registration: UseFormRegisterReturn; options: Equipment[]; currentId: string | null }) { return <select className="h-10 w-full rounded-lg bg-[var(--dialed-surface-subtle)] px-3 text-xs" {...registration}><option value="">Nicht gewählt</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}{currentId && !options.some((item) => item.id === currentId) && <option value={currentId}>Archiviertes Equipment</option>}</select>; }
