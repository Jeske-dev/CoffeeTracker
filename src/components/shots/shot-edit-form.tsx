"use client";
/* React Hook Form intentionally manages mutable form state outside React Compiler memoization. */
/* eslint-disable react-hooks/incompatible-library */

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateShot } from "@/features/data/actions";
import {
  createShotEditDefaults,
  getSelectableBeans,
  groupShotEquipment,
  stepGrindSetting,
} from "@/features/shots/form-model";
import { usePrivateCache } from "@/hooks/use-private-cache";
import { togglePrepTool as withToggledPrepTool, type PrepTool } from "@/lib/prep-tools";
import { shotEditSchema, type ShotEditInput } from "@/lib/validation";
import type { Bean, Equipment, Shot } from "@/types/domain";
import {
  BeanSelectControl,
  GrindControl,
  nullableNumber,
  nullableString,
  NumberControl,
  PrepToolsControl,
  requiredNumber,
  SelectControl,
} from "./shot-form-controls";
import { ShotExtractionFormSection, ShotReviewFormSection } from "./shot-form-panels";
import { ShotSetupSection } from "./shot-sections";

export function ShotEditForm({ userId, shot, beans, equipment }: { userId: string; shot: Shot; beans: Bean[]; equipment: Equipment[] }) {
  const router = useRouter();
  const { invalidateShotData } = usePrivateCache();
  const [pending, startTransition] = useTransition();
  const selectableBeans = useMemo(() => getSelectableBeans(beans, shot.bean_id), [beans, shot.bean_id]);
  const { machines, grinders, baskets } = useMemo(() => groupShotEquipment(equipment, shot), [equipment, shot]);
  const defaults = useMemo(() => createShotEditDefaults(shot), [shot]);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ShotEditInput>({
    resolver: zodResolver(shotEditSchema),
    defaultValues: defaults,
  });
  const values = watch();

  const togglePrepTool = (tool: PrepTool) => {
    setValue("prepTools", withToggledPrepTool(values.prepTools ?? [], tool), { shouldDirty: true });
  };

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
    <div className="scrollbar-none min-h-0 overflow-y-auto px-6 py-6 pb-8"><div className="mx-auto max-w-[680px]">
      <ShotSetupSection fields={{
        shotAt: { value: <input aria-label="Zeitpunkt" type="datetime-local" className="h-9 w-full bg-transparent font-bold outline-none" {...register("shotAt")} /> },
        bean: { value: <BeanSelectControl label="Bohne" options={selectableBeans} value={values.beanId} onValueChange={(value) => setValue("beanId", value, { shouldDirty: true, shouldValidate: true })} /> },
        machine: { value: <SelectControl label="Maschine" equipmentType="machine" options={machines} value={values.machineId} onValueChange={(value) => setValue("machineId", value, { shouldDirty: true, shouldValidate: true })} /> },
        grinder: { value: <SelectControl label="Mühle" equipmentType="grinder" options={grinders} value={values.grinderId} onValueChange={(value) => setValue("grinderId", value, { shouldDirty: true, shouldValidate: true })} /> },
        grind: { value: <GrindControl value={values.grindSetting} registration={register("grindSetting", nullableString)} onStep={(delta) => setValue("grindSetting", stepGrindSetting(values.grindSetting, delta), { shouldDirty: true })} /> },
        dose: { value: <NumberControl ariaLabel="Dosis" unit="g" registration={register("doseGrams", requiredNumber)} /> },
        prepTools: { value: <PrepToolsControl value={values.prepTools ?? []} onToggle={togglePrepTool} /> },
        basket: { value: <SelectControl label="Sieb" equipmentType="basket" options={baskets} value={values.basketId} onValueChange={(value) => setValue("basketId", value, { shouldDirty: true, shouldValidate: true })} /> },
      }} />
      <ShotExtractionFormSection
        stopWeightGrams={values.stopWeightGrams}
        finalYieldGrams={values.finalYieldGrams}
        timeRegistration={register("extractionSeconds", nullableNumber)}
        stopRegistration={register("stopWeightGrams", nullableNumber)}
        finalYieldRegistration={register("finalYieldGrams", requiredNumber)}
      />
      <ShotReviewFormSection
        taste={values.taste}
        rating={values.overallTasteRating}
        flow={values.flow}
        puck={values.puck}
        notesRegistration={register("notes")}
        onTasteChange={(taste, rating) => {
          setValue("taste", taste, { shouldDirty: true });
          setValue("overallTasteRating", rating, { shouldDirty: true });
        }}
        onFlowChange={(flow) => setValue("flow", flow, { shouldDirty: true })}
        onPuckChange={(puck) => setValue("puck", puck, { shouldDirty: true })}
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
    <footer className="z-10 flex gap-2 border-t border-black bg-white px-6 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]">
      <Button type="button" variant="secondary" onClick={() => router.back()} className="h-12 flex-1">Abbrechen</Button>
      <Button disabled={pending} type="submit" className="h-12 flex-1 bg-black text-white">{pending ? "Speichert ..." : "Änderungen speichern"}</Button>
    </footer>
  </form>;
}

function FormErrors({ errors }: { errors: Array<string | undefined> }) {
  const message = errors.find((error): error is string => Boolean(error));
  return message ? <div role="alert" className="mt-3 border border-[var(--crema-error)] bg-[var(--dialed-rose-soft)] p-3 text-xs text-[var(--dialed-rose)]">{message}</div> : null;
}
