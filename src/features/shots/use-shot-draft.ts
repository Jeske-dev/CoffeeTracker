"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { UseFormReset } from "react-hook-form";
import { toast } from "sonner";
import { readShotDraft, writeShotDraft } from "@/lib/shot-draft";
import type { ShotInput } from "@/lib/validation";
import { restoreShotDraft } from "./form-model";

export type ShotFormStep = 1 | 2 | 3;

export function useShotDraft({
  userId,
  defaults,
  step,
  values,
  reset,
  setStep,
}: {
  userId: string;
  defaults: ShotInput;
  step: ShotFormStep;
  values: ShotInput;
  reset: UseFormReset<ShotInput>;
  setStep: Dispatch<SetStateAction<ShotFormStep>>;
}) {
  const initialized = useRef(false);
  const latestValues = useRef(values);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    latestValues.current = values;
  }, [values]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const draft = readShotDraft(userId);
    if (draft) {
      reset(restoreShotDraft(defaults, draft.values));
      setStep(draft.step);
      toast.info("Shot-Entwurf fortgesetzt", { id: "shot-draft-restored" });
    }
    setReady(true);
  }, [defaults, reset, setStep, userId]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => writeShotDraft(userId, step, values), 350);
    return () => window.clearTimeout(timer);
  }, [ready, step, userId, values]);

  useEffect(() => {
    if (!ready) return;
    // pagehide persists the latest state when the app closes before the debounce finishes.
    const preserve = () => writeShotDraft(userId, step, latestValues.current);
    window.addEventListener("pagehide", preserve);
    return () => window.removeEventListener("pagehide", preserve);
  }, [ready, step, userId]);

  return useCallback(
    (nextValues: ShotInput = latestValues.current) => writeShotDraft(userId, step, nextValues),
    [step, userId],
  );
}
