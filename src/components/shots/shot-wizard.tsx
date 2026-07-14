"use client";
/* React Hook Form intentionally manages mutable form state outside React Compiler memoization. */
/* eslint-disable react-hooks/incompatible-library */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Info, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveShot } from "@/features/data/actions";
import { resolveNextShotTargets } from "@/features/recommendations/next-shot-targets";
import {
  buildOptimisticShot,
  calculateShotInputScore,
  createShotDefaults,
  getSelectableBeans,
  groupShotEquipment,
  prepareShotSubmission,
  recommendationMatchesSetup,
  stepGrindSetting,
} from "@/features/shots/form-model";
import { calculateStopWeightTip, type StopWeightHistoryShot } from "@/features/shots/stop-weight-tip";
import { useShotDraft, type ShotFormStep } from "@/features/shots/use-shot-draft";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { usePrivateCache } from "@/hooks/use-private-cache";
import { privateCacheKeys } from "@/lib/cache/keys";
import { runOptimisticMutation } from "@/lib/cache/optimistic-mutation";
import type { ShotsPayload } from "@/lib/cache/types";
import { formatWeight } from "@/lib/formatting";
import { togglePrepTool as withToggledPrepTool, type PrepTool } from "@/lib/prep-tools";
import { removeShotDraft } from "@/lib/shot-draft";
import { shotSchema, type ShotInput } from "@/lib/validation";
import type { Bean, Equipment, RecommendationBundleRecord, Shot, UserSettings } from "@/types/domain";
import {
  BeanSelectControl,
  GrindControl,
  nullableNumber,
  nullableString,
  NumberControl,
  PrepToolsControl,
  requiredNumber,
} from "./shot-form-controls";
import { ShotExtractionFormSection, ShotReviewFormSection, ShotSetupSummary } from "./shot-form-panels";
import { ShotRecipeSection } from "./shot-sections";

const emptyStopWeightHistory: StopWeightHistoryShot[] = [];

export function ShotWizard({
  userId,
  beans,
  equipment,
  settings,
  lastShot,
  recommendation = null,
  stopWeightHistory = emptyStopWeightHistory,
}: {
  userId: string;
  beans: Bean[];
  equipment: Equipment[];
  settings: UserSettings | null;
  lastShot: Shot | null;
  recommendation?: RecommendationBundleRecord | null;
  stopWeightHistory?: StopWeightHistoryShot[];
}) {
  const router = useRouter();
  const { mutate, invalidateShotData } = usePrivateCache();
  const isOnline = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<ShotFormStep>(1);
  const activeBeans = useMemo(() => getSelectableBeans(beans), [beans]);
  const { machines, grinders } = useMemo(() => groupShotEquipment(equipment), [equipment]);
  const defaults = useMemo(() => createShotDefaults({ beans, settings, lastShot }), [beans, lastShot, settings]);
  const { register, watch, setValue, trigger, handleSubmit, reset, formState: { errors } } = useForm<ShotInput>({
    resolver: zodResolver(shotSchema),
    defaultValues: defaults,
  });
  const values = watch();
  const saveDraft = useShotDraft({ userId, defaults, step, values, reset, setStep });
  const targets = resolveNextShotTargets(recommendation, lastShot);
  const matchesRecommendationSetup = recommendationMatchesSetup(recommendation, values);
  const stopWeightTip = useMemo(() => calculateStopWeightTip({
    beanId: values.beanId || null,
    grinderId: values.grinderId,
    grindSetting: values.grindSetting,
    targetFinalWeightGrams: values.finalYieldGrams,
    history: stopWeightHistory,
  }), [stopWeightHistory, values.beanId, values.finalYieldGrams, values.grindSetting, values.grinderId]);

  const close = () => {
    saveDraft();
    toast.success("Shot als Entwurf gespeichert", { description: "Du kannst ihn unter Shots weiter bearbeiten." });
    router.push("/app/shots");
  };

  const next = async () => {
    if (step === 1) {
      if (await trigger(["beanId", "doseGrams"])) setStep(2);
      return;
    }
    if (await trigger(["extractionSeconds", "stopWeightGrams", "finalYieldGrams"])) setStep(3);
  };

  const togglePrepTool = (tool: PrepTool) => {
    setValue("prepTools", withToggledPrepTool(values.prepTools ?? [], tool), { shouldDirty: true });
  };

  const submit = (data: ShotInput) => {
    if (!isOnline) {
      saveDraft(data);
      toast.error("Offline gespeichert", { description: "Der Entwurf bleibt auf diesem Gerät. Speichere den Shot, sobald du wieder online bist." });
      return;
    }

    const submittedData = prepareShotSubmission(data, defaults);
    const scoreResult = calculateShotInputScore(submittedData);
    startTransition(async () => {
      const key = privateCacheKeys.shots(userId);
      const optimisticId = `optimistic-${Date.now()}`;
      const shotAt = new Date().toISOString();
      const bean = activeBeans.find((item) => item.id === submittedData.beanId) ?? null;
      const optimisticShot = buildOptimisticShot({
        id: optimisticId,
        shotAt,
        input: submittedData,
        bean,
        score: scoreResult.score,
        coverage: scoreResult.coverage,
      });

      try {
        const result = await runOptimisticMutation<ShotsPayload, Awaited<ReturnType<typeof saveShot>>>({
          mutate: (current, options) => mutate<ShotsPayload>(key, current, options),
          optimisticData: (current) => current ? { ...current, shots: [optimisticShot, ...current.shots] } : current,
          mutation: async () => {
            const result = await saveShot(submittedData);
            if (!result.ok) throw new globalThis.Error(result.message);
            return result;
          },
          commit: (current, result) => current ? {
            ...current,
            shots: current.shots.map((shot) => shot.id === optimisticId ? {
              ...shot,
              id: result.id ?? optimisticId,
              score: result.score ?? shot.score,
              score_coverage: result.coverage ?? shot.score_coverage,
            } : shot),
          } : current,
        });
        await invalidateShotData({ userId, beanId: submittedData.beanId, shotId: result.id, preserveShotList: true });
        removeShotDraft(userId);
        toast.success("Shot gespeichert");
        router.replace("/app");
      } catch (error) {
        toast.error(error instanceof globalThis.Error ? error.message : "Der Shot konnte nicht gespeichert werden.");
      }
    });
  };

  const selectedMachine = machines.find((item) => item.id === values.machineId) ?? null;
  const selectedGrinder = grinders.find((item) => item.id === values.grinderId) ?? null;
  const doseHint = matchesRecommendationSetup && targets.changed.dose && targets.doseGrams !== values.doseGrams
    ? <TargetHint value={formatWeight(targets.doseGrams)} />
    : undefined;
  const grindHint = matchesRecommendationSetup && targets.changed.grind && targets.grindSetting !== values.grindSetting
    ? <TargetHint value={targets.grindSetting ?? "–"} />
    : undefined;
  return <div className="fixed inset-0 z-50 grid bg-[var(--dialed-surface)] min-[561px]:absolute">
    <header className="border-b bg-[rgba(251,248,243,.95)] px-[18px] pt-[calc(16px+env(safe-area-inset-top))] pb-3 backdrop-blur">
      <div className="grid grid-cols-[44px_1fr_44px] items-center">
        <button type="button" onClick={close} aria-label="Schließen" title="Schließen" className="grid size-11 place-items-center rounded-full bg-[var(--dialed-surface-subtle)]"><X className="size-[18px]" /></button>
        <h1 className="text-center font-display text-[22px]">Neuer Shot</h1>
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-1.5">{[1, 2, 3].map((item) => <span key={item} className={`h-1 rounded-full ${item <= step ? "bg-[var(--dialed-crema)]" : "bg-[var(--dialed-surface-strong)]"}`} />)}</div>
      <div className="mt-1.5 grid grid-cols-3 text-center text-[10px] text-[var(--dialed-text-muted)]">{["Rezept", "Extraktion", "Bewertung"].map((label, index) => <span key={label} className={step === index + 1 ? "font-extrabold text-[var(--dialed-text)]" : ""}>{label}</span>)}</div>
    </header>
    <form onSubmit={handleSubmit(submit)} className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
      <input type="hidden" {...register("beanId")} />
      <input type="hidden" {...register("machineId", nullableString)} />
      <input type="hidden" {...register("grinderId", nullableString)} />
      <input type="hidden" {...register("basketId", nullableString)} />
      <div className="scrollbar-none min-h-0 overflow-y-auto px-[18px] py-[19px] pb-6"><div className="mx-auto max-w-[680px]">
        {step === 1 && <>
          <PageTitle>Rezept</PageTitle>
          <ShotRecipeSection fields={{
            bean: { value: <BeanSelectControl label="Bohne wählen" options={activeBeans} value={values.beanId} onValueChange={(value) => setValue("beanId", value, { shouldDirty: true, shouldValidate: true })} /> },
            grind: { value: <GrindControl value={values.grindSetting} registration={register("grindSetting", nullableString)} onStep={(delta) => setValue("grindSetting", stepGrindSetting(values.grindSetting, delta), { shouldDirty: true })} />, hint: grindHint },
            dose: { value: <NumberControl ariaLabel="Dosis" unit="g" registration={register("doseGrams", requiredNumber)} />, hint: doseHint },
            prepTools: { value: <PrepToolsControl value={values.prepTools ?? []} onToggle={togglePrepTool} /> },
          }} />
          <FormError text={errors.beanId?.message ?? errors.doseGrams?.message} />
          <ShotSetupSummary machine={selectedMachine} grinder={selectedGrinder} />
        </>}
        {step === 2 && <>
          <PageTitle>Extraktion</PageTitle>
          <ShotExtractionFormSection
            stopWeightGrams={values.stopWeightGrams}
            finalYieldGrams={values.finalYieldGrams}
            timeRegistration={register("extractionSeconds", nullableNumber)}
            stopRegistration={register("stopWeightGrams", nullableNumber)}
            finalYieldRegistration={register("finalYieldGrams", requiredNumber)}
            stopTip={stopWeightTip}
          />
          <FormError text={errors.extractionSeconds?.message ?? errors.stopWeightGrams?.message ?? errors.finalYieldGrams?.message} />
        </>}
        {step === 3 && <>
          <PageTitle>Bewertung</PageTitle>
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
        </>}
      </div></div>
      <footer className="flex gap-2.5 border-t bg-[rgba(251,248,243,.94)] px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] backdrop-blur">
        <Button type="button" variant="secondary" onClick={() => setStep((current) => Math.max(1, current - 1) as ShotFormStep)} className={`h-12 flex-1 rounded-full ${step === 1 ? "invisible" : ""}`}><ChevronLeft />Zurück</Button>
        {step < 3
          ? <Button key={`next-${step}`} type="button" onClick={(event) => { event.preventDefault(); void next(); }} className="h-12 flex-1 rounded-full bg-[var(--dialed-crema)] text-[var(--dialed-text)]">Weiter</Button>
          : <Button type="submit" disabled={pending || !isOnline} className="h-12 flex-1 rounded-full bg-[var(--dialed-crema)] text-[var(--dialed-text)]">{pending ? "Speichert ..." : isOnline ? "Shot speichern" : "Offline – Entwurf bleibt erhalten"}</Button>}
      </footer>
    </form>
  </div>;
}

function PageTitle({ children }: { children: string }) {
  return <h2 className="mb-4 font-display text-[25px] font-medium">{children}</h2>;
}

function FormError({ text }: { text?: string }) {
  return text ? <p role="alert" className="mt-2 text-xs text-[var(--dialed-rose)]">{text}</p> : null;
}

function TargetHint({ value }: { value: string }) {
  return <p aria-label={`Zielwert aus deinen letzten Shots: ${value}`} className="mt-1.5 flex items-center gap-1.5 px-1 text-xs leading-4 text-[var(--dialed-sage)]"><Info aria-hidden="true" className="size-3.5 shrink-0" /><span>Ziel: <strong>{value}</strong></span></p>;
}
