"use client";
/* React Hook Form intentionally manages mutable form state outside React Compiler memoization. */
/* eslint-disable react-hooks/incompatible-library */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Circle, CircleMinus, CirclePlus, Droplets, Sun, TriangleAlert, Waves } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { calculateDialedScore, postStopDrip, scoreTargetFromSnapshot } from "@/lib/calculations";
import { formatRatio, formatWeight } from "@/lib/formatting";
import { shotEditSchema, type ShotEditInput } from "@/lib/validation";
import { updateShot } from "@/features/data/actions";
import { usePrivateCache } from "@/hooks/use-private-cache";
import {
  BeanSelectControl,
  GrindControl,
  nullableNumber,
  nullableString,
  NumberControl,
  RatingControl,
  requiredNumber,
  SegmentedControl,
  SelectControl,
  ToggleChip,
} from "./shot-form-controls";
import { ShotExtractionSection, ShotReviewSection, ShotSetupSection } from "./shot-sections";
import type { Bean, Equipment, Shot } from "@/types/domain";

const tastes = [
  ["sour", "Zu sauer", CircleMinus],
  ["balanced", "Ausgewogen", CheckCircle2],
  ["bitter", "Zu bitter", CirclePlus],
] as const;
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
  const prepTools = (shot.prep_tools ?? []).filter((tool) => tool === "WDT" || tool === "Puck Screen");
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
  const scoreResult = calculateDialedScore({
    doseGrams: values.doseGrams,
    finalYieldGrams: values.finalYieldGrams,
    extractionSeconds: values.extractionSeconds,
    overallTasteRating: values.overallTasteRating,
    tasteBalance: values.taste,
    extractionPicture: values.flow,
    targetRecipe: scoreTargetFromSnapshot(values.targetRecipeSnapshot),
  });
  const ratioValue = values.doseGrams && values.finalYieldGrams ? values.finalYieldGrams / values.doseGrams : null;
  const overshoot = postStopDrip(values.finalYieldGrams ?? null, values.stopWeightGrams);
  const hasPrepTool = (tool: "WDT" | "Puck Screen") => (values.prepTools ?? []).includes(tool);
  const togglePrepTool = (tool: "WDT" | "Puck Screen") => setValue(
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
    toast.success("Shot aktualisiert", { description: result.message });
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
          wdt: { value: <ToggleChip label="WDT" active={hasPrepTool("WDT")} onClick={() => togglePrepTool("WDT")} /> },
          puckScreen: { value: <ToggleChip label="Puck Screen" active={hasPrepTool("Puck Screen")} onClick={() => togglePrepTool("Puck Screen")} /> },
          basket: { value: <SelectControl label="Sieb" equipmentType="basket" options={baskets} value={values.basketId} onValueChange={(value) => setValue("basketId", value, { shouldDirty: true, shouldValidate: true })} /> },
        }}
      />
      <ShotExtractionSection
        mode="edit"
        fields={{
          time: { value: <NumberControl ariaLabel="Extraktionszeit" unit="s" registration={register("extractionSeconds", nullableNumber)} /> },
          finalYield: { value: <NumberControl ariaLabel="Finales Getränkgewicht" unit="g" registration={register("finalYieldGrams", requiredNumber)} /> },
          ratio: { value: formatRatio(ratioValue) },
          stopWeight: { value: <NumberControl ariaLabel="Stop-Gewicht" unit="g" registration={register("stopWeightGrams", nullableNumber)} /> },
          overshoot: { value: formatWeight(overshoot) },
        }}
      />
      <ShotReviewSection
        mode="edit"
        fields={{
          rating: { value: <RatingControl value={values.overallTasteRating} onSelect={(value) => setValue("overallTasteRating", values.overallTasteRating === value ? null : value, { shouldDirty: true })} /> },
          taste: { value: <SegmentedControl values={tastes} active={values.taste} onSelect={(value) => setValue("taste", values.taste === value ? null : value, { shouldDirty: true })} /> },
          extractionPicture: { value: <SegmentedControl values={extractionPictures} active={values.flow} onSelect={(value) => setValue("flow", values.flow === value ? null : value, { shouldDirty: true })} /> },
          puck: { value: <SegmentedControl values={pucks} active={values.puck} onSelect={(value) => setValue("puck", values.puck === value ? null : value, { shouldDirty: true })} columns={4} /> },
          notes: { value: <Textarea aria-label="Notiz" className="min-h-24 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0" placeholder="Optional" {...register("notes")} /> },
          score: { value: <ScorePreview result={scoreResult} /> },
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

function ScorePreview({ result }: { result: ReturnType<typeof calculateDialedScore> }) {
  return <div className="flex items-center gap-3 rounded-[14px] bg-[var(--dialed-espresso)] p-3 text-white"><strong className="grid size-12 shrink-0 place-items-center rounded-full bg-white/10 font-display text-xl">{result.score ?? "—"}</strong><span><strong className="block text-xs">{result.coverage}% · {result.coverageLabel}</strong>{result.missingTasteEvaluation && <small className="mt-1 block text-[9px] leading-4 text-white/65">Für einen vollständigen Score fehlt noch eine kurze Geschmacksbewertung.</small>}</span></div>;
}

function FormErrors({ errors }: { errors: Array<string | undefined> }) {
  const visible = errors.filter((error): error is string => Boolean(error));
  return visible.length ? <div role="alert" className="mt-3 rounded-[16px] bg-[var(--dialed-rose-soft)] p-3 text-[10px] text-[var(--dialed-rose)]">{visible[0]}</div> : null;
}
