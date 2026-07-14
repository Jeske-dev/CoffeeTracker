"use client";
/* React Hook Form intentionally manages mutable form state outside React Compiler memoization. */
/* eslint-disable react-hooks/incompatible-library */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  ChevronLeft,
  Circle,
  CircleMinus,
  CirclePlus,
  Droplets,
  Pause,
  Play,
  RotateCcw,
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
import { formatRatio } from "@/lib/formatting";
import { shotSchema, type ShotInput } from "@/lib/validation";
import { removeShotDraft, readShotDraft, writeShotDraft } from "@/lib/shot-draft";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { usePrivateCache } from "@/hooks/use-private-cache";
import { privateCacheKeys } from "@/lib/cache/keys";
import type { ShotsPayload } from "@/lib/cache/types";
import { runOptimisticMutation } from "@/lib/cache/optimistic-mutation";
import { applyRecommendation, dismissRecommendation, saveShot } from "@/features/data/actions";
import { applyRecommendationToDefaults } from "@/features/recommendations/apply";
import { RecommendationFieldHint } from "@/features/recommendations/components/recommendation-field-hint";
import { RECOMMENDATION_ENGINE_VERSION, type RecommendationBundle } from "@/features/recommendations/types";
import { EquipmentIdentity } from "@/components/entities/entity-icons";
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
import type { Bean, Equipment, RecommendationBundleRecord, Shot, ShotSummary, UserSettings } from "@/types/domain";

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
const timerStorageKey = (userId: string) => `dialed:shot-timer:${userId}`;
const MAX_RESTORED_TIMER_MS = 30 * 60 * 1000;

type RecommendationMode = "apply" | "suggest";

export function ShotWizard({
  userId,
  beans,
  equipment,
  settings,
  lastShot,
  recommendation = null,
  recommendationMode = "suggest",
}: {
  userId: string;
  beans: Bean[];
  equipment: Equipment[];
  settings: UserSettings | null;
  lastShot: Shot | null;
  recommendation?: RecommendationBundleRecord | null;
  recommendationMode?: RecommendationMode;
}) {
  const router = useRouter();
  const { mutate, invalidateShotData, invalidateRecommendationData } = usePrivateCache();
  const isOnline = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draftReady, setDraftReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [setupExpanded, setSetupExpanded] = useState(false);
  const [tipHidden, setTipHidden] = useState(false);
  const baseRef = useRef(0);
  const startedAtRef = useRef(0);
  const frameRef = useRef(0);
  const activeBeans = beans.filter((bean) => !bean.archived_at);
  const machines = equipment.filter((item) => item.type === "machine" && !item.archived_at);
  const grinders = equipment.filter((item) => item.type === "grinder" && !item.archived_at);
  const baskets = equipment.filter((item) => item.type === "basket" && !item.archived_at);
  const defaultBean = activeBeans.find((bean) => bean.id === settings?.last_bean_id)
    ?? activeBeans.find((bean) => bean.id === lastShot?.bean_id)
    ?? activeBeans[0];
  const recommendationBundle = recommendation ? {
    engineVersion: RECOMMENDATION_ENGINE_VERSION,
    sourceShotId: recommendation.source_shot_id,
    targetRecipeSnapshot: recommendation.target_recipe_snapshot,
    primary: recommendation.primary_action,
    executionAdjustment: recommendation.execution_adjustments,
    generatedAt: recommendation.created_at,
  } as unknown as RecommendationBundle : null;
  const recommendationSetup = recommendationMode === "apply" ? recommendation : null;
  const prepDefaults = (lastShot?.prep_tools ?? settings?.default_prep_tools ?? []).filter((tool) => tool === "WDT" || tool === "Puck Screen");
  const baseDefaults: ShotInput = {
    beanId: recommendationSetup?.bean_id ?? defaultBean?.id ?? "",
    machineId: recommendationSetup?.machine_id ?? lastShot?.machine_id ?? (settings?.auto_fill ? settings.default_machine_id : null),
    grinderId: recommendationSetup?.grinder_id ?? lastShot?.grinder_id ?? (settings?.auto_fill ? settings.default_grinder_id : null),
    basketId: recommendationSetup?.basket_id ?? lastShot?.basket_id ?? null,
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
    targetRecipeSnapshot: (recommendationBundle?.targetRecipeSnapshot as unknown as Record<string, unknown> | null) ?? null,
    recommendationBundleId: recommendationMode === "apply" ? recommendation?.id ?? null : null,
    recommendationApplied: recommendationMode === "apply" && Boolean(recommendation),
    recommendationChanges: recommendationMode === "apply" ? recommendationBundle?.primary.changes ?? [] : [],
    experimentMode: recommendationMode === "apply" && Boolean(recommendation),
  };
  const appliedPlan = recommendationMode === "apply" && recommendationBundle
    ? applyRecommendationToDefaults(baseDefaults, recommendationBundle)
    : null;
  if (appliedPlan && recommendationBundle?.targetRecipeSnapshot) {
    const nextTarget = { ...recommendationBundle.targetRecipeSnapshot } as Record<string, unknown>;
    const change = recommendationBundle.primary.changes[0];
    if (change && ["doseGrams", "targetYieldGrams", "grindSetting", "prepTools"].includes(change.field)) nextTarget[change.field] = change.recommendedValue;
    appliedPlan.values.targetRecipeSnapshot = nextTarget;
  }
  const initialDefaults = appliedPlan?.values ?? baseDefaults;
  const primaryChange = recommendationBundle?.primary.changes[0] ?? null;
  const fieldMap: Record<string, keyof ShotInput> = { targetYieldGrams: "finalYieldGrams" };
  const tipField = primaryChange ? (fieldMap[primaryChange.field] ?? primaryChange.field as keyof ShotInput) : null;
  const [tipApplied, setTipApplied] = useState(recommendationMode === "apply" && Boolean(tipField));
  const originalRecommendedValues = useRef<Record<string, unknown>>(appliedPlan?.originals ?? {});
  const { register, watch, setValue, trigger, handleSubmit, reset, formState: { errors } } = useForm<ShotInput>({
    resolver: zodResolver(shotSchema),
    defaultValues: initialDefaults,
  });
  const values = watch();
  const matchesRecommendationSetup = (candidate: Pick<ShotInput, "beanId" | "machineId" | "grinderId" | "basketId">) => !recommendation || (
    candidate.beanId === recommendation.bean_id &&
    candidate.machineId === recommendation.machine_id &&
    candidate.grinderId === recommendation.grinder_id &&
    candidate.basketId === recommendation.basket_id
  );
  const recommendationMatchesSetup = matchesRecommendationSetup(values);
  const effectiveTargetSnapshot = recommendationMatchesSetup ? values.targetRecipeSnapshot : null;
  const scoreResult = calculateDialedScore({
    doseGrams: values.doseGrams,
    finalYieldGrams: values.finalYieldGrams,
    extractionSeconds: values.extractionSeconds,
    overallTasteRating: values.overallTasteRating,
    tasteBalance: values.taste,
    extractionPicture: values.flow,
    targetRecipe: scoreTargetFromSnapshot(effectiveTargetSnapshot),
  });

  useEffect(() => {
    const draft = recommendationMode === "apply" ? null : readShotDraft(userId);
    if (draft) {
      let restoredElapsed = draft.values.extractionSeconds ? draft.values.extractionSeconds * 1000 : 0;
      reset(draft.values);
      setStep(draft.step);
      try {
        const timer = JSON.parse(window.localStorage.getItem(timerStorageKey(userId)) ?? "null") as { startedAt?: number; baseMs?: number } | null;
        if (timer?.startedAt && typeof timer.baseMs === "number") {
          const liveElapsed = timer.baseMs + Date.now() - timer.startedAt;
          if (liveElapsed > 0 && liveElapsed <= MAX_RESTORED_TIMER_MS) {
            restoredElapsed = liveElapsed;
            baseRef.current = timer.baseMs;
            startedAtRef.current = timer.startedAt;
            setRunning(true);
            setValue("extractionSeconds", liveElapsed / 1000, { shouldValidate: false });
          } else {
            window.localStorage.removeItem(timerStorageKey(userId));
          }
        }
      } catch {
        window.localStorage.removeItem(timerStorageKey(userId));
      }
      setElapsed(restoredElapsed);
      if (!startedAtRef.current) baseRef.current = restoredElapsed;
      toast.info("Shot-Entwurf fortgesetzt", { id: "shot-draft-restored" });
    }
    setDraftReady(true);
  }, [recommendationMode, reset, setValue, userId]);

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

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const next = baseRef.current + Date.now() - startedAtRef.current;
      setElapsed(next);
      setValue("extractionSeconds", Math.max(0.1, next / 1000), { shouldValidate: false });
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [running, setValue]);

  useEffect(() => {
    if (running || values.extractionSeconds === null) return;
    const milliseconds = values.extractionSeconds * 1000;
    if (Math.abs(milliseconds - elapsed) < 100) return;
    baseRef.current = milliseconds;
    setElapsed(milliseconds);
  }, [elapsed, running, values.extractionSeconds]);

  const toggleTimer = () => {
    if (running) {
      baseRef.current = elapsed;
      setRunning(false);
      window.localStorage.removeItem(timerStorageKey(userId));
      return;
    }
    startedAtRef.current = Date.now();
    window.localStorage.setItem(timerStorageKey(userId), JSON.stringify({ startedAt: startedAtRef.current, baseMs: baseRef.current }));
    setRunning(true);
  };
  const resetTimer = () => {
    setRunning(false);
    baseRef.current = 0;
    startedAtRef.current = 0;
    setElapsed(0);
    setValue("extractionSeconds", null);
    window.localStorage.removeItem(timerStorageKey(userId));
  };
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
    if (await trigger(["extractionSeconds", "stopWeightGrams", "finalYieldGrams"])) {
      if (running) {
        baseRef.current = elapsed;
        setRunning(false);
        window.localStorage.removeItem(timerStorageKey(userId));
      }
      setStep(3);
    }
  };

  const updateTargetForChange = (change: NonNullable<typeof primaryChange>) => {
    if (!["doseGrams", "targetYieldGrams", "grindSetting", "prepTools"].includes(change.field)) return;
    const current = values.targetRecipeSnapshot ?? recommendationBundle?.targetRecipeSnapshot ?? {};
    setValue("targetRecipeSnapshot", { ...current, [change.field]: change.recommendedValue }, { shouldDirty: true });
  };
  const applyTip = () => {
    if (!recommendation || !recommendationBundle || !primaryChange || !tipField) return;
    startTransition(async () => {
      const result = await applyRecommendation(recommendation.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      originalRecommendedValues.current[tipField] = values[tipField];
      setValue(tipField, primaryChange.recommendedValue as never, { shouldDirty: true, shouldValidate: true });
      updateTargetForChange(primaryChange);
      setValue("recommendationBundleId", recommendation.id);
      setValue("recommendationApplied", true);
      setValue("recommendationChanges", [primaryChange]);
      setValue("experimentMode", true);
      setTipApplied(true);
      await invalidateRecommendationData(userId);
    });
  };
  const dismissTip = () => {
    if (!recommendation) return;
    setTipHidden(true);
    setValue("recommendationBundleId", null);
    setValue("recommendationApplied", false);
    setValue("recommendationChanges", []);
    setValue("experimentMode", false);
    startTransition(async () => {
      await dismissRecommendation(recommendation.id);
      await invalidateRecommendationData(userId);
    });
  };
  const undoTip = () => {
    if (tipField) setValue(tipField, originalRecommendedValues.current[tipField] as never, { shouldDirty: true, shouldValidate: true });
    setTipApplied(false);
    dismissTip();
  };
  const tipText = recommendationBundle?.primary.explanation ?? "Diesen Wert für den nächsten Shot anpassen.";
  const fieldHint = (field: keyof ShotInput) => recommendationMatchesSetup && !tipHidden && tipField === field
    ? <RecommendationFieldHint text={tipText} state={tipApplied ? "applied" : "suggested"} pending={pending} onApply={applyTip} onUndo={undoTip} onDismiss={dismissTip} />
    : undefined;
  const highlighted = (field: keyof ShotInput) => recommendationMatchesSetup && !tipHidden && tipField === field;
  const hintedTargetYield = recommendationBundle?.targetRecipeSnapshot?.targetYieldGrams ?? values.finalYieldGrams;
  const stopHint = recommendationMatchesSetup && !tipHidden && recommendationBundle?.executionAdjustment
    ? <RecommendationFieldHint text={`Bei ungefähr ${recommendationBundle.executionAdjustment.recommendedStopWeightGrams.toLocaleString("de-DE")} g stoppen${hintedTargetYield == null ? "" : `, um etwa ${hintedTargetYield.toLocaleString("de-DE")} g finales Gewicht zu erreichen`}.`} />
    : undefined;

  const submit = (data: ShotInput) => {
    if (!isOnline) {
      writeShotDraft(userId, step, data);
      toast.error("Offline gespeichert", { description: "Der Entwurf bleibt auf diesem Gerät. Speichere den Shot, sobald du wieder online bist." });
      return;
    }
    const normalizedData: ShotInput = recommendation && !matchesRecommendationSetup(data)
      ? {
          ...data,
          targetRecipeSnapshot: null,
          recommendationBundleId: null,
          recommendationApplied: false,
          recommendationChanges: [],
          experimentMode: false,
        }
      : data;
    const recommendedChanges = normalizedData.recommendationApplied && primaryChange && tipField
      ? [{ ...primaryChange, actualValue: normalizedData[tipField] }]
      : [];
    const recommendedFormFields = new Set(recommendedChanges.map(() => tipField));
    const manualFields = (["grindSetting", "doseGrams", "prepTools", "finalYieldGrams", "stopWeightGrams"] as const)
      .filter((field) => !recommendedFormFields.has(field) && JSON.stringify(normalizedData[field]) !== JSON.stringify(baseDefaults[field]))
      .map((field) => ({ field, previousValue: baseDefaults[field], recommendedValue: normalizedData[field], actualValue: normalizedData[field], manual: true }));
    const submittedData = { ...normalizedData, recommendationChanges: [...recommendedChanges, ...manualFields] };
    startTransition(async () => {
      const key = privateCacheKeys.shots(userId);
      const optimisticId = `optimistic-${Date.now()}`;
      const bean = activeBeans.find((item) => item.id === normalizedData.beanId) ?? null;
      const optimisticShot: ShotSummary = {
        id: optimisticId,
        bean_id: normalizedData.beanId,
        machine_id: normalizedData.machineId,
        grinder_id: normalizedData.grinderId,
        basket_id: normalizedData.basketId,
        shot_at: new Date().toISOString(),
        grind_setting: normalizedData.grindSetting,
        dose_grams: normalizedData.doseGrams,
        extraction_seconds: normalizedData.extractionSeconds,
        stop_weight_grams: normalizedData.stopWeightGrams,
        final_yield_grams: normalizedData.finalYieldGrams,
        taste: normalizedData.taste,
        flow: normalizedData.flow,
        score: scoreResult.score,
        score_coverage: scoreResult.coverage,
        target_recipe_snapshot: normalizedData.targetRecipeSnapshot ?? null,
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
        await invalidateShotData({ userId, beanId: normalizedData.beanId, shotId: result.id, preserveShotList: true });
        window.localStorage.removeItem(timerStorageKey(userId));
        removeShotDraft(userId);
        toast.success("Shot gespeichert", { description: result.message });
        router.push(`/app/shots/${result.id}`);
      } catch (error) {
        toast.error(error instanceof globalThis.Error ? error.message : "Der Shot konnte nicht gespeichert werden.");
      }
    });
  };

  const timerText = `${String(Math.floor(elapsed / 60000)).padStart(2, "0")}:${String(Math.floor(elapsed / 1000) % 60).padStart(2, "0")}.${Math.floor(elapsed / 100) % 10}`;
  const ratioValue = values.doseGrams && values.finalYieldGrams ? values.finalYieldGrams / values.doseGrams : null;
  const selectedMachine = machines.find((item) => item.id === values.machineId) ?? null;
  const selectedGrinder = grinders.find((item) => item.id === values.grinderId) ?? null;
  const prepTool = (tool: "WDT" | "Puck Screen") => (values.prepTools ?? []).includes(tool);
  const togglePrepTool = (tool: "WDT" | "Puck Screen") => {
    const active = prepTool(tool);
    setValue("prepTools", active ? (values.prepTools ?? []).filter((item) => item !== tool) : [...(values.prepTools ?? []), tool], { shouldDirty: true });
  };

  return <div className="fixed inset-0 z-50 grid bg-[var(--dialed-surface)] min-[561px]:absolute">
    <header className="border-b bg-[rgba(251,248,243,.95)] px-[18px] pt-[calc(16px+env(safe-area-inset-top))] pb-3 backdrop-blur">
      <div className="grid grid-cols-[40px_1fr_40px] items-center">
        <button type="button" onClick={close} aria-label="Schließen" title="Schließen" className="grid size-[44px] place-items-center rounded-full bg-[var(--dialed-surface-subtle)]"><X className="size-[18px]" /></button>
        <h1 className="text-center font-display text-[22px]">Neuer Shot</h1>
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-1.5">{[1, 2, 3].map((item) => <span key={item} className={`h-1 rounded-full ${item <= step ? "bg-[var(--dialed-crema)]" : "bg-[var(--dialed-surface-strong)]"}`} />)}</div>
      <div className="mt-1.5 grid grid-cols-3 text-center text-[8px] text-[var(--dialed-text-muted)]">{["Setup", "Extraktion", "Bewertung"].map((label, index) => <span key={label} className={step === index + 1 ? "font-extrabold text-[var(--dialed-text)]" : ""}>{label}</span>)}</div>
    </header>
    <form onSubmit={handleSubmit(submit)} className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
      <input type="hidden" {...register("beanId")} />
      <input type="hidden" {...register("machineId", nullableString)} />
      <input type="hidden" {...register("grinderId", nullableString)} />
      <input type="hidden" {...register("basketId", nullableString)} />
      <div className="scrollbar-none min-h-0 overflow-y-auto px-[18px] py-[19px] pb-6"><div className="mx-auto max-w-[680px]">
        {step === 1 && <>
          <PageTitle>Setup</PageTitle>
          <ShotSetupSection
            mode="create"
            action={<button type="button" onClick={() => setSetupExpanded((current) => !current)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-[10px] font-bold text-[var(--dialed-sage)]"><Settings2 className="size-3.5" />{setupExpanded ? "Fertig" : "Setup ändern"}</button>}
            fields={{
              bean: { value: <><BeanSelectControl label="Bohne wählen" options={activeBeans} value={values.beanId} onValueChange={(value) => setValue("beanId", value, { shouldDirty: true, shouldValidate: true })} /><FieldError text={errors.beanId?.message} /></> },
              machine: { value: setupExpanded ? <SelectControl label="Maschine" equipmentType="machine" options={machines} value={values.machineId} onValueChange={(value) => setValue("machineId", value, { shouldDirty: true, shouldValidate: true })} /> : <EquipmentIdentity equipment={selectedMachine} type="machine" /> },
              grinder: { value: setupExpanded ? <SelectControl label="Mühle" equipmentType="grinder" options={grinders} value={values.grinderId} onValueChange={(value) => setValue("grinderId", value, { shouldDirty: true, shouldValidate: true })} /> : <EquipmentIdentity equipment={selectedGrinder} type="grinder" /> },
              grind: { value: <GrindControl value={values.grindSetting} registration={register("grindSetting", nullableString)} onStep={(delta) => setValue("grindSetting", ((Number(values.grindSetting) || 0) + delta).toFixed(1), { shouldDirty: true })} />, hint: fieldHint("grindSetting"), highlighted: highlighted("grindSetting") },
              dose: { value: <NumberControl ariaLabel="Dosis" unit="g" registration={register("doseGrams", requiredNumber)} />, hint: fieldHint("doseGrams"), highlighted: highlighted("doseGrams") },
              wdt: { value: <ToggleChip label="WDT" active={prepTool("WDT")} onClick={() => togglePrepTool("WDT")} />, hint: fieldHint("prepTools"), highlighted: highlighted("prepTools") },
              puckScreen: { value: <ToggleChip label="Puck Screen" active={prepTool("Puck Screen")} onClick={() => togglePrepTool("Puck Screen")} /> },
              basket: setupExpanded ? { value: <SelectControl label="Sieb" equipmentType="basket" options={baskets} value={values.basketId} onValueChange={(value) => setValue("basketId", value, { shouldDirty: true, shouldValidate: true })} />, wide: true } : undefined,
            }}
          />
          <FieldError text={errors.doseGrams?.message} />
        </>}
        {step === 2 && <>
          <PageTitle>Extraktion</PageTitle>
          <ShotExtractionSection
            mode="create"
            timer={<div className="mb-4 py-1 text-center">
              <div className="relative mx-auto mb-4 grid size-[188px] place-items-center rounded-full p-2.5 shadow-[0_18px_40px_rgba(54,34,24,.1)]" style={{ background: `conic-gradient(var(--dialed-crema) ${Math.min(100, elapsed / 400)}%,var(--dialed-surface-strong) 0)` }}>
                <div className="grid size-full place-items-center rounded-full border bg-[var(--dialed-surface)]"><strong className="font-mono text-[38px]">{timerText}</strong></div>
              </div>
              <div className="flex justify-center gap-2">
                <Button type="button" onClick={toggleTimer} aria-label={running ? "Timer stoppen" : "Timer starten"} title={running ? "Timer stoppen" : "Timer starten"} className={`size-12 rounded-full p-0 ${running ? "bg-[var(--dialed-rose)]" : "bg-[var(--dialed-espresso)]"}`}>{running ? <Pause className="size-4" /> : <Play className="size-4" />}</Button>
                <Button type="button" variant="secondary" onClick={resetTimer} aria-label="Timer zurücksetzen" title="Timer zurücksetzen" className="size-12 rounded-full p-0"><RotateCcw className="size-4" /></Button>
              </div>
            </div>}
            summary={<div className="mb-3 grid grid-cols-3 gap-2 rounded-[16px] bg-[var(--dialed-espresso)] px-3 py-3 text-center text-white"><LiveMetric label="Dosis" value={values.doseGrams == null ? "—" : `${values.doseGrams.toLocaleString("de-DE")} g`} /><LiveMetric label="Ziel" value={values.finalYieldGrams == null ? "—" : `${values.finalYieldGrams.toLocaleString("de-DE")} g`} /><LiveMetric label="Ratio" value={formatRatio(ratioValue)} /></div>}
            fields={{
              time: { value: <NumberControl ariaLabel="Extraktionszeit" unit="s" registration={register("extractionSeconds", nullableNumber)} /> },
              finalYield: { value: <NumberControl ariaLabel="Finales Getränkgewicht" unit="g" registration={register("finalYieldGrams", requiredNumber)} />, hint: fieldHint("finalYieldGrams"), highlighted: highlighted("finalYieldGrams") },
              ratio: { value: formatRatio(ratioValue) },
              stopWeight: { value: <NumberControl ariaLabel="Stop-Gewicht" unit="g" registration={register("stopWeightGrams", nullableNumber)} />, hint: stopHint },
            }}
          />
          <FieldError text={errors.extractionSeconds?.message ?? errors.finalYieldGrams?.message ?? errors.stopWeightGrams?.message} />
        </>}
        {step === 3 && <>
          <PageTitle>Bewertung</PageTitle>
          <ShotReviewSection
            mode="create"
            fields={{
              rating: { value: <RatingControl value={values.overallTasteRating} onSelect={(value) => setValue("overallTasteRating", values.overallTasteRating === value ? null : value, { shouldDirty: true })} /> },
              taste: { value: <SegmentedControl values={tastes} active={values.taste} onSelect={(value) => setValue("taste", values.taste === value ? null : value, { shouldDirty: true })} /> },
              extractionPicture: { value: <SegmentedControl values={extractionPictures} active={values.flow} onSelect={(value) => setValue("flow", values.flow === value ? null : value, { shouldDirty: true })} /> },
              puck: { value: <SegmentedControl values={pucks} active={values.puck} onSelect={(value) => setValue("puck", values.puck === value ? null : value, { shouldDirty: true })} columns={4} /> },
              notes: { value: <Textarea aria-label="Notiz" className="min-h-24 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0" placeholder="Optional" {...register("notes")} /> },
              score: { value: <ScorePreview result={scoreResult} /> },
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
  return text ? <p role="alert" className="mt-2 text-[10px] text-[var(--dialed-rose)]">{text}</p> : null;
}

function LiveMetric({ label, value }: { label: string; value: string }) {
  return <span className="min-w-0"><small className="block text-[8px] text-white/55">{label}</small><strong className="mt-1 block truncate text-[11px]">{value}</strong></span>;
}

function ScorePreview({ result }: { result: ReturnType<typeof calculateDialedScore> }) {
  return <div className="flex items-center gap-3 rounded-[14px] bg-[var(--dialed-espresso)] p-3 text-white">
    <strong className="grid size-12 shrink-0 place-items-center rounded-full bg-white/10 font-display text-xl">{result.score ?? "—"}</strong>
    <span className="min-w-0"><strong className="block text-xs">{result.coverage}% · {result.coverageLabel}</strong>{result.missingTasteEvaluation && <small className="mt-1 block text-[9px] leading-4 text-white/65">Für einen vollständigen Score fehlt noch eine kurze Geschmacksbewertung.</small>}{!result.missingTasteEvaluation && !result.complete && <small className="mt-1 block text-[9px] leading-4 text-white/65">Für einen vollständigen Score fehlt noch die Extraktionszeit.</small>}</span>
  </div>;
}
