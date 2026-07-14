"use client";
/* React Hook Form intentionally manages mutable form state outside React Compiler memoization. */
/* eslint-disable react-hooks/incompatible-library */

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  ChevronLeft,
  Circle,
  Droplets,
  Info,
  Settings2,
  Sun,
  TriangleAlert,
  Waves,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { calculateDialedScore, scoreTargetFromSnapshot, SCORING_VERSION } from "@/lib/calculations";
import { formatRatio, formatWeight } from "@/lib/formatting";
import { shotSchema, type ShotInput } from "@/lib/validation";
import { removeShotDraft, readShotDraft, writeShotDraft } from "@/lib/shot-draft";
import { PREP_TOOLS, type PrepTool } from "@/lib/prep-tools";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { usePrivateCache } from "@/hooks/use-private-cache";
import { privateCacheKeys } from "@/lib/cache/keys";
import type { ShotsPayload } from "@/lib/cache/types";
import { runOptimisticMutation } from "@/lib/cache/optimistic-mutation";
import { saveShot } from "@/features/data/actions";
import { resolveNextShotTargets } from "@/features/recommendations/next-shot-targets";
import { EquipmentIdentity } from "@/components/entities/entity-icons";
import {
  BeanSelectControl,
  GrindControl,
  nullableNumber,
  nullableString,
  NumberControl,
  PrepToolsControl,
  requiredNumber,
  SegmentedControl,
  TasteMatrixControl,
} from "./shot-form-controls";
import { ShotExtractionSection, ShotRecipeSection, ShotReviewSection, ShotSummaryCard } from "./shot-sections";
import { YieldFlowGraphic } from "./shot-visuals";
import type { Bean, Equipment, RecommendationBundleRecord, Shot, ShotSummary, UserSettings } from "@/types/domain";

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

export function ShotWizard({
  userId,
  beans,
  equipment,
  settings,
  lastShot,
  recommendation = null,
}: {
  userId: string;
  beans: Bean[];
  equipment: Equipment[];
  settings: UserSettings | null;
  lastShot: Shot | null;
  recommendation?: RecommendationBundleRecord | null;
}) {
  const router = useRouter();
  const { mutate, invalidateShotData } = usePrivateCache();
  const isOnline = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draftReady, setDraftReady] = useState(false);
  const activeBeans = beans.filter((bean) => !bean.archived_at);
  const machines = equipment.filter((item) => item.type === "machine" && !item.archived_at);
  const grinders = equipment.filter((item) => item.type === "grinder" && !item.archived_at);
  const baskets = equipment.filter((item) => item.type === "basket" && !item.archived_at);
  const defaultBean = activeBeans.find((bean) => bean.id === settings?.last_bean_id)
    ?? activeBeans.find((bean) => bean.id === lastShot?.bean_id)
    ?? activeBeans[0];
  const prepDefaults = (settings ? settings.default_prep_tools : lastShot?.prep_tools ?? []).filter(isPrepTool);
  const baseDefaults: ShotInput = {
    beanId: defaultBean?.id ?? "",
    machineId: settings?.default_machine_id ?? lastShot?.machine_id ?? null,
    grinderId: settings?.default_grinder_id ?? lastShot?.grinder_id ?? null,
    basketId: lastShot?.basket_id ?? null,
    grindSetting: lastShot?.grind_setting ?? null,
    doseGrams: lastShot?.dose_grams ?? 18,
    prepTools: prepDefaults,
    extractionSeconds: null,
    stopWeightGrams: lastShot?.stop_weight_grams ?? null,
    finalYieldGrams: lastShot?.final_yield_grams ?? 36,
    taste: null,
    flow: null,
    puck: null,
    notes: null,
    overallTasteRating: null,
    targetRecipeSnapshot: null,
    recommendationBundleId: null,
    recommendationApplied: false,
    recommendationChanges: [],
    experimentMode: false,
  };
  const { register, watch, setValue, trigger, handleSubmit, reset, formState: { errors } } = useForm<ShotInput>({
    resolver: zodResolver(shotSchema),
    defaultValues: baseDefaults,
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
  const targets = resolveNextShotTargets(recommendation, lastShot);
  const recommendationMatchesSetup = Boolean(recommendation)
    && recommendation?.bean_id === values.beanId
    && recommendation?.machine_id === values.machineId
    && recommendation?.grinder_id === values.grinderId
    && recommendation?.basket_id === values.basketId;

  useEffect(() => {
    const draft = readShotDraft(userId);
    if (draft) {
      reset({
        ...baseDefaults,
        ...draft.values,
        machineId: baseDefaults.machineId,
        grinderId: baseDefaults.grinderId,
        basketId: baseDefaults.basketId,
        prepTools: (draft.values.prepTools ?? []).filter(isPrepTool),
        targetRecipeSnapshot: null,
        recommendationBundleId: null,
        recommendationApplied: false,
        recommendationChanges: [],
        experimentMode: false,
      });
      setStep(draft.step);
      toast.info("Shot-Entwurf fortgesetzt", { id: "shot-draft-restored" });
    }
    setDraftReady(true);
  // The initial defaults are intentionally captured once for restoring the local draft.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset, userId]);

  useEffect(() => {
    if (!draftReady) return;
    const timer = window.setTimeout(() => writeShotDraft(userId, step, values), 350);
    return () => window.clearTimeout(timer);
  }, [draftReady, step, userId, values]);

  useEffect(() => {
    if (!draftReady) return;
    const preserve = () => writeShotDraft(userId, step, values);
    window.addEventListener("pagehide", preserve);
    return () => window.removeEventListener("pagehide", preserve);
  }, [draftReady, step, userId, values]);

  const close = () => {
    writeShotDraft(userId, step, values);
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
    const current = values.prepTools ?? [];
    setValue("prepTools", current.includes(tool) ? current.filter((item) => item !== tool) : [...current, tool], { shouldDirty: true });
  };

  const submit = (data: ShotInput) => {
    if (!isOnline) {
      writeShotDraft(userId, step, data);
      toast.error("Offline gespeichert", { description: "Der Entwurf bleibt auf diesem Gerät. Speichere den Shot, sobald du wieder online bist." });
      return;
    }
    const trackedFields = (["doseGrams", "grindSetting", "stopWeightGrams"] as const)
      .filter((field) => JSON.stringify(data[field]) !== JSON.stringify(baseDefaults[field]))
      .map((field) => ({ field, previousValue: baseDefaults[field], recommendedValue: data[field], actualValue: data[field], manual: true }));
    const submittedData: ShotInput = {
      ...data,
      targetRecipeSnapshot: null,
      recommendationBundleId: null,
      recommendationApplied: false,
      recommendationChanges: trackedFields,
      experimentMode: false,
    };
    startTransition(async () => {
      const key = privateCacheKeys.shots(userId);
      const optimisticId = `optimistic-${Date.now()}`;
      const bean = activeBeans.find((item) => item.id === submittedData.beanId) ?? null;
      const optimisticShot: ShotSummary = {
        id: optimisticId,
        bean_id: submittedData.beanId,
        machine_id: submittedData.machineId,
        grinder_id: submittedData.grinderId,
        basket_id: submittedData.basketId,
        shot_at: new Date().toISOString(),
        grind_setting: submittedData.grindSetting,
        dose_grams: submittedData.doseGrams,
        extraction_seconds: submittedData.extractionSeconds,
        stop_weight_grams: submittedData.stopWeightGrams,
        final_yield_grams: submittedData.finalYieldGrams,
        taste: submittedData.taste,
        flow: submittedData.flow,
        score: scoreResult.score,
        score_coverage: scoreResult.coverage,
        target_recipe_snapshot: null,
        scoring_version: SCORING_VERSION,
        beans: bean ? { id: bean.id, name: bean.name, roaster: bean.roaster, roast_date: bean.roast_date, origin: bean.origin } : null,
      };
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

  const ratioValue = values.doseGrams && values.finalYieldGrams ? values.finalYieldGrams / values.doseGrams : null;
  const selectedMachine = machines.find((item) => item.id === values.machineId) ?? null;
  const selectedGrinder = grinders.find((item) => item.id === values.grinderId) ?? null;
  const selectedBasket = baskets.find((item) => item.id === values.basketId) ?? null;
  const doseHint = recommendationMatchesSetup && targets.changed.dose && targets.doseGrams !== values.doseGrams
    ? <TargetHint value={formatWeight(targets.doseGrams)} />
    : undefined;
  const grindHint = recommendationMatchesSetup && targets.changed.grind && targets.grindSetting !== values.grindSetting
    ? <TargetHint value={targets.grindSetting ?? "—"} />
    : undefined;
  const stopHint = recommendationMatchesSetup && targets.changed.stop && targets.stopWeightGrams !== values.stopWeightGrams
    ? <TargetHint value={formatWeight(targets.stopWeightGrams)} />
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
          <ShotRecipeSection
            mode="create"
            fields={{
              bean: { value: <><BeanSelectControl label="Bohne wählen" options={activeBeans} value={values.beanId} onValueChange={(value) => setValue("beanId", value, { shouldDirty: true, shouldValidate: true })} /><FieldError text={errors.beanId?.message} /></> },
              grind: { value: <GrindControl value={values.grindSetting} registration={register("grindSetting", nullableString)} onStep={(delta) => setValue("grindSetting", ((Number(values.grindSetting) || 0) + delta).toFixed(1), { shouldDirty: true })} />, hint: grindHint },
              dose: { value: <NumberControl ariaLabel="Dosis" unit="g" registration={register("doseGrams", requiredNumber)} />, hint: doseHint },
              prepTools: { value: <PrepToolsControl value={values.prepTools ?? []} onToggle={togglePrepTool} /> },
            }}
          />
          <FieldError text={errors.doseGrams?.message} />
          <ShotSummaryCard title="Setup" icon={Settings2}>
            <div className="grid gap-2 sm:grid-cols-3">
              <SetupItem label="Maschine"><EquipmentIdentity equipment={selectedMachine} type="machine" fallback="Nicht festgelegt" /></SetupItem>
              <SetupItem label="Mühle"><EquipmentIdentity equipment={selectedGrinder} type="grinder" fallback="Nicht festgelegt" /></SetupItem>
              <SetupItem label="Sieb"><EquipmentIdentity equipment={selectedBasket} type="basket" fallback="Nicht festgelegt" /></SetupItem>
            </div>
            <p className="mt-3 flex items-start gap-2 border-t pt-3 text-xs leading-5 text-[var(--dialed-text-muted)]"><Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /><span>Dieses Setup gilt für den Shot. <Link href="/app/setup" className="font-bold text-[var(--dialed-sage)]">In den Einstellungen ändern</Link></span></p>
          </ShotSummaryCard>
        </>}
        {step === 2 && <>
          <PageTitle>Extraktion</PageTitle>
          <ShotExtractionSection
            mode="create"
            summary={<div className="mb-3">
              <YieldFlowGraphic stopWeight={values.stopWeightGrams} finalWeight={values.finalYieldGrams} />
              <div className="mt-2 flex min-h-10 items-center justify-between gap-3 rounded-[12px] bg-[var(--dialed-surface-subtle)] px-3 text-xs"><span className="text-[var(--dialed-text-muted)]">Brew Ratio</span><strong>{formatRatio(ratioValue)}</strong></div>
            </div>}
            fields={{
              time: { value: <NumberControl ariaLabel="Extraktionszeit" unit="s" registration={register("extractionSeconds", nullableNumber)} /> },
              stopWeight: { value: <NumberControl ariaLabel="Stop-Gewicht" unit="g" registration={register("stopWeightGrams", nullableNumber)} />, hint: stopHint },
              finalYield: { value: <NumberControl ariaLabel="Finales Getränkgewicht" unit="g" registration={register("finalYieldGrams", requiredNumber)} /> },
            }}
          />
          <FieldError text={errors.extractionSeconds?.message ?? errors.finalYieldGrams?.message ?? errors.stopWeightGrams?.message} />
        </>}
        {step === 3 && <>
          <PageTitle>Bewertung</PageTitle>
          <ShotReviewSection
            mode="create"
            fields={{
              taste: { value: <TasteMatrixControl taste={values.taste} rating={values.overallTasteRating} onSelect={(taste, rating) => { setValue("taste", taste, { shouldDirty: true }); setValue("overallTasteRating", rating, { shouldDirty: true }); }} /> },
              extractionPicture: { value: <SegmentedControl values={extractionPictures} active={values.flow} onSelect={(value) => setValue("flow", values.flow === value ? null : value, { shouldDirty: true })} /> },
              puck: { value: <SegmentedControl values={pucks} active={values.puck} onSelect={(value) => setValue("puck", values.puck === value ? null : value, { shouldDirty: true })} columns={4} /> },
              notes: { value: <Textarea aria-label="Notiz" className="min-h-24 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0" placeholder="Optional" {...register("notes")} /> },
            }}
          />
        </>}
      </div></div>
      <footer className="flex gap-2.5 border-t bg-[rgba(251,248,243,.94)] px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] backdrop-blur">
        <Button type="button" variant="secondary" onClick={() => setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3)} className={`h-12 flex-1 rounded-full ${step === 1 ? "invisible" : ""}`}><ChevronLeft />Zurück</Button>
        {step < 3
          ? <Button key={`next-${step}`} type="button" onClick={(event) => { event.preventDefault(); void next(); }} className="h-12 flex-1 rounded-full bg-[var(--dialed-crema)] text-[var(--dialed-text)]">Weiter</Button>
          : <Button type="submit" disabled={pending || !isOnline} className="h-12 flex-1 rounded-full bg-[var(--dialed-crema)] text-[var(--dialed-text)]">{pending ? "Speichert …" : isOnline ? "Shot speichern" : "Offline – Entwurf bleibt erhalten"}</Button>}
      </footer>
    </form>
  </div>;
}

function PageTitle({ children }: { children: string }) {
  return <h2 className="mb-4 font-display text-[25px] font-medium">{children}</h2>;
}

function FieldError({ text }: { text?: string }) {
  return text ? <p role="alert" className="mt-2 text-xs text-[var(--dialed-rose)]">{text}</p> : null;
}

function TargetHint({ value }: { value: string }) {
  return <p aria-label={`Zielwert aus deinen letzten Shots: ${value}`} className="mt-1.5 flex items-center gap-1.5 px-1 text-xs leading-4 text-[var(--dialed-sage)]"><Info aria-hidden="true" className="size-3.5 shrink-0" /><span>Ziel: <strong>{value}</strong></span></p>;
}

function SetupItem({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 rounded-[12px] bg-[var(--dialed-surface-subtle)] p-3"><span className="mb-2 block text-xs text-[var(--dialed-text-muted)]">{label}</span><div className="min-w-0 text-xs">{children}</div></div>;
}

function isPrepTool(tool: string): tool is PrepTool {
  return PREP_TOOLS.some((candidate) => candidate === tool);
}
