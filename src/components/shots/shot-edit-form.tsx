"use client";
/* React Hook Form intentionally manages mutable form state outside React Compiler memoization. */
/* eslint-disable react-hooks/incompatible-library */

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateShot } from "@/features/data/actions";
import {
  createShotEditDefaults,
  getSelectableBeans,
  groupShotEquipment,
  stepGrindSetting,
  stepNumericValue,
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
  const { machines, grinders } = useMemo(() => groupShotEquipment(equipment, shot), [equipment, shot]);
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

  return <form id="shot-edit-form" aria-label="Shot bearbeiten" aria-busy={pending} onSubmit={handleSubmit(submit)} className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden">
    <input type="hidden" {...register("beanId")} />
    <input type="hidden" {...register("machineId", nullableString)} />
    <input type="hidden" {...register("grinderId", nullableString)} />
    <input type="hidden" {...register("basketId", nullableString)} />
    <div className="form-scroll-region px-6 py-6 pb-[env(safe-area-inset-bottom)]"><div className="mx-auto max-w-[680px]">
      <ShotSetupSection fields={{
        shotAt: { value: <input aria-label="Zeitpunkt" type="datetime-local" className="h-9 w-full bg-transparent font-bold outline-none" {...register("shotAt")} /> },
        bean: { value: <BeanSelectControl label="Bohne" options={selectableBeans} value={values.beanId} onValueChange={(value) => setValue("beanId", value, { shouldDirty: true, shouldValidate: true })} /> },
        grind: { value: <GrindControl value={values.grindSetting} registration={register("grindSetting", nullableString)} onStep={(delta) => setValue("grindSetting", stepGrindSetting(values.grindSetting, delta), { shouldDirty: true })} /> },
        dose: { value: <NumberControl ariaLabel="Dosis" unit="g" value={values.doseGrams} registration={register("doseGrams", requiredNumber)} onStep={(delta) => setValue("doseGrams", stepNumericValue(values.doseGrams, delta), { shouldDirty: true, shouldValidate: true })} /> },
        prepTools: { value: <PrepToolsControl value={values.prepTools ?? []} onToggle={togglePrepTool} /> },
        machine: { value: <SelectControl label="Maschine" equipmentType="machine" options={machines} value={values.machineId} onValueChange={(value) => setValue("machineId", value, { shouldDirty: true, shouldValidate: true })} /> },
        grinder: { value: <SelectControl label="Mühle" equipmentType="grinder" options={grinders} value={values.grinderId} onValueChange={(value) => setValue("grinderId", value, { shouldDirty: true, shouldValidate: true })} /> },
      }} />
      <ShotExtractionFormSection
        timeValue={values.extractionSeconds}
        stopWeightGrams={values.stopWeightGrams}
        finalYieldGrams={values.finalYieldGrams}
        timeRegistration={register("extractionSeconds", nullableNumber)}
        stopRegistration={register("stopWeightGrams", nullableNumber)}
        finalYieldRegistration={register("finalYieldGrams", requiredNumber)}
        onTimeChange={(value) => setValue("extractionSeconds", value, { shouldDirty: true, shouldValidate: true })}
        onStopWeightStep={(delta) => {
          const fallback = Math.max(0, (values.finalYieldGrams ?? 0) - 2);
          setValue("stopWeightGrams", stepNumericValue(values.stopWeightGrams ?? fallback, delta), { shouldDirty: true, shouldValidate: true });
        }}
        onFinalYieldStep={(delta) => setValue("finalYieldGrams", stepNumericValue(values.finalYieldGrams, delta), { shouldDirty: true, shouldValidate: true })}
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
      <div aria-hidden="true" data-form-end-spacer className="h-20" />
    </div></div>
  </form>;
}

function FormErrors({ errors }: { errors: Array<string | undefined> }) {
  const message = errors.find((error): error is string => Boolean(error));
  return message ? <div role="alert" className="mt-3 border border-[var(--crema-error)] bg-[var(--dialed-rose-soft)] p-3 text-xs text-[var(--dialed-rose)]">{message}</div> : null;
}
