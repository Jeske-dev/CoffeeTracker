"use client";
/* React Hook Form intentionally manages mutable form state outside React Compiler memoization. */
/* eslint-disable react-hooks/incompatible-library */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Circle, Droplets, Sun, TriangleAlert, Waves } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatRatio } from "@/lib/formatting";
import { PREP_TOOLS, type PrepTool } from "@/lib/prep-tools";
import { shotEditSchema, type ShotEditInput } from "@/lib/validation";
import { updateShot } from "@/features/data/actions";
import { usePrivateCache } from "@/hooks/use-private-cache";
import {
  BeanSelectControl,
  GrindControl,
  nullableNumber,
  nullableString,
  NumberControl,
  PrepToolsControl,
  requiredNumber,
  SegmentedControl,
  SelectControl,
  TasteMatrixControl,
} from "./shot-form-controls";
import { ShotExtractionSection, ShotReviewSection, ShotSetupSection } from "./shot-sections";
import { YieldFlowGraphic } from "./shot-visuals";
import type { Bean, Equipment, Shot } from "@/types/domain";

const extractionPictures = [
  ["even", "Gleichmäßig", Circle],
  ["minor_channeling", "Leichtes Channeling", Waves],
  ["channeling", "Starkes Channeling", TriangleAlert],
] as const;
const pucks = [
  ["ideal", "Normal", CheckCircle2],
  ["wet", "Nass", Droplets],
  ["dry", "Trocken", Sun],
  ["stuck", "Festhängend", TriangleAlert],
] as const;

const toLocalDateTime = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function ShotEditForm({ userId, shot, beans, equipment }: { userId: string; shot: Shot; beans: Bean[]; equipment: Equipment[] }) {
  const router = useRouter();
  const { invalidateShotData } = usePrivateCache();
  const [pending, startTransition] = useTransition();
  const machines = equipment.filter((item) => item.type === "machine" && (!item.archived_at || item.id === shot.machine_id));
  const grinders = equipment.filter((item) => item.type === "grinder" && (!item.archived_at || item.id === shot.grinder_id));
  const baskets = equipment.filter((item) => item.type === "basket" && (!item.archived_at || item.id === shot.basket_id));
  const prepTools = (shot.prep_tools ?? []).filter(isPrepTool);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ShotEditInput>({
    resolver: zodResolver(shotEditSchema),
    defaultValues: {
      shotAt: toLocalDateTime(shot.shot_at),
      beanId: shot.bean_id,
      machineId: shot.machine_id,
      grinderId: shot.grinder_id,
      basketId: shot.basket_id,
      grindSetting: shot.grind_setting,
      doseGrams: shot.dose_grams ?? undefined,
      prepTools,
      extractionSeconds: shot.extraction_seconds,
      stopWeightGrams: shot.stop_weight_grams,
      finalYieldGrams: shot.final_yield_grams ?? undefined,
      taste: shot.taste,
      flow: shot.flow,
      puck: shot.puck,
      notes: shot.notes,
      overallTasteRating: shot.overall_taste_rating,
      targetRecipeSnapshot: shot.target_recipe_snapshot,
      recommendationBundleId: null,
      recommendationApplied: false,
      recommendationChanges: [],
      experimentMode: false,
    },
  });
  const values = watch();
  const ratioValue = values.doseGrams && values.finalYieldGrams ? values.finalYieldGrams / values.doseGrams : null;
  const hasPrepTool = (tool: PrepTool) => (values.prepTools ?? []).includes(tool);
  const togglePrepTool = (tool: PrepTool) => setValue(
    "prepTools",
    hasPrepTool(tool) ? (values.prepTools ?? []).filter((item) => item !== tool) : [...(values.prepTools ?? []), tool],
    { shouldDirty: true },
  );

  const submit = (data: ShotEditInput) => startTransition(async () => {
    const result = await updateShot(shot.id, data);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    await invalidateShotData({ userId, beanId: data.beanId, previousBeanId: shot.bean_id, shotId: shot.id });
    toast.success("Shot aktualisiert");
    router.push(`/app/shots/${shot.id}`);
  });

  return <form onSubmit={handleSubmit(submit)} className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
    <input type="hidden" {...register("beanId")} />
    <input type="hidden" {...register("machineId", nullableString)} />
    <input type="hidden" {...register("grinderId", nullableString)} />
    <input type="hidden" {...register("basketId", nullableString)} />
    <div className="scrollbar-none min-h-0 overflow-y-auto px-[18px] py-5 pb-6"><div className="mx-auto max-w-[680px]">
      <ShotSetupSection
        mode="edit"
        fields={{
          shotAt: { value: <input aria-label="Zeitpunkt" type="datetime-local" className="h-9 w-full bg-transparent font-bold outline-none" {...register("shotAt")} /> },
          bean: { value: <BeanSelectControl label="Bohne" options={beans.filter((bean) => !bean.archived_at || bean.id === shot.bean_id)} value={values.beanId} onValueChange={(value) => setValue("beanId", value, { shouldDirty: true, shouldValidate: true })} /> },
          machine: { value: <SelectControl label="Maschine" equipmentType="machine" options={machines} value={values.machineId} onValueChange={(value) => setValue("machineId", value, { shouldDirty: true, shouldValidate: true })} /> },
          grinder: { value: <SelectControl label="Mühle" equipmentType="grinder" options={grinders} value={values.grinderId} onValueChange={(value) => setValue("grinderId", value, { shouldDirty: true, shouldValidate: true })} /> },
          grind: { value: <GrindControl value={values.grindSetting} registration={register("grindSetting", nullableString)} onStep={(delta) => setValue("grindSetting", ((Number(values.grindSetting) || 0) + delta).toFixed(1), { shouldDirty: true })} /> },
          dose: { value: <NumberControl ariaLabel="Dosis" unit="g" registration={register("doseGrams", requiredNumber)} /> },
          prepTools: { value: <PrepToolsControl value={values.prepTools ?? []} onToggle={togglePrepTool} /> },
          basket: { value: <SelectControl label="Sieb" equipmentType="basket" options={baskets} value={values.basketId} onValueChange={(value) => setValue("basketId", value, { shouldDirty: true, shouldValidate: true })} /> },
        }}
      />
      <ShotExtractionSection
        mode="edit"
        summary={<div className="mb-3">
          <YieldFlowGraphic stopWeight={values.stopWeightGrams} finalWeight={values.finalYieldGrams ?? null} />
          <div className="mt-2 flex min-h-10 items-center justify-between gap-3 rounded-[12px] bg-[var(--dialed-surface-subtle)] px-3 text-xs"><span className="text-[var(--dialed-text-muted)]">Brew Ratio</span><strong>{formatRatio(ratioValue)}</strong></div>
        </div>}
        fields={{
          time: { value: <NumberControl ariaLabel="Extraktionszeit" unit="s" registration={register("extractionSeconds", nullableNumber)} /> },
          stopWeight: { value: <NumberControl ariaLabel="Stop-Gewicht" unit="g" registration={register("stopWeightGrams", nullableNumber)} /> },
          finalYield: { value: <NumberControl ariaLabel="Finales Getränkgewicht" unit="g" registration={register("finalYieldGrams", requiredNumber)} /> },
        }}
      />
      <ShotReviewSection
        mode="edit"
        fields={{
          taste: { value: <TasteMatrixControl taste={values.taste} rating={values.overallTasteRating} onSelect={(taste, rating) => { setValue("taste", taste, { shouldDirty: true }); setValue("overallTasteRating", rating, { shouldDirty: true }); }} /> },
          extractionPicture: { value: <SegmentedControl values={extractionPictures} active={values.flow} onSelect={(value) => setValue("flow", values.flow === value ? null : value, { shouldDirty: true })} /> },
          puck: { value: <SegmentedControl values={pucks} active={values.puck} onSelect={(value) => setValue("puck", values.puck === value ? null : value, { shouldDirty: true })} columns={4} /> },
          notes: { value: <Textarea aria-label="Notiz" className="min-h-24 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0" placeholder="Optional" {...register("notes")} /> },
        }}
      />
      <FormErrors errors={[
        errors.shotAt?.message,
        errors.beanId?.message,
        errors.doseGrams?.message,
        errors.extractionSeconds?.message,
        errors.stopWeightGrams?.message,
        errors.finalYieldGrams?.message,
      ]} />
    </div></div>
    <footer className="z-10 flex gap-2 border-t bg-[rgba(251,248,243,.96)] px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(54,34,24,.05)] backdrop-blur">
      <Button type="button" variant="secondary" onClick={() => router.back()} className="h-12 flex-1 rounded-full">Abbrechen</Button>
      <Button disabled={pending} type="submit" className="h-12 flex-1 rounded-full bg-[var(--dialed-crema)] text-[var(--dialed-text)]">{pending ? "Speichert ..." : "Änderungen speichern"}</Button>
    </footer>
  </form>;
}

function FormErrors({ errors }: { errors: Array<string | undefined> }) {
  const visible = errors.filter((error): error is string => Boolean(error));
  return visible.length ? <div role="alert" className="mt-3 rounded-[16px] bg-[var(--dialed-rose-soft)] p-3 text-[10px] text-[var(--dialed-rose)]">{visible[0]}</div> : null;
}

function isPrepTool(tool: string): tool is PrepTool {
  return PREP_TOOLS.some((candidate) => candidate === tool);
}
