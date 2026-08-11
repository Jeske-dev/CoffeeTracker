"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveSetup } from "@/features/data/actions";
import { usePrivateCache } from "@/hooks/use-private-cache";
import { setupSchema, type SetupInput } from "./schema";

export type SetupSaveStatus = "saved" | "saving" | "error" | "invalid";

export function useSetupAutosave({
  userId,
  payload,
  editing,
}: {
  userId: string;
  payload: SetupInput;
  editing: boolean;
}) {
  const { invalidateSetupData } = usePrivateCache();
  const snapshot = JSON.stringify(payload);
  const valid = setupSchema.safeParse(payload).success;
  const [saveStatus, setSaveStatus] = useState<Exclude<SetupSaveStatus, "invalid">>("saved");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(snapshot);
  const [failedSnapshot, setFailedSnapshot] = useState<string | null>(null);
  const lastQueuedSnapshot = useRef(snapshot);
  const latestSnapshot = useRef(snapshot);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  const enqueueSave = useCallback((nextPayload: SetupInput, nextSnapshot: string) => {
    lastQueuedSnapshot.current = nextSnapshot;
    setFailedSnapshot(null);
    setSaveStatus("saving");

    // Saves stay ordered so a slow older request cannot overwrite a newer setup.
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        const result = await saveSetup(nextPayload);
        if (!result.ok) {
          if (latestSnapshot.current === nextSnapshot) {
            if (lastQueuedSnapshot.current === nextSnapshot) lastQueuedSnapshot.current = "";
            setFailedSnapshot(nextSnapshot);
            setSaveStatus("error");
            toast.error(result.message, { id: "setup-autosave-error" });
          }
          return;
        }

        if (latestSnapshot.current === nextSnapshot) {
          setFailedSnapshot(null);
          setLastSavedSnapshot(nextSnapshot);
          setSaveStatus("saved");
        }
        try {
          await invalidateSetupData(userId);
        } catch (cacheError) {
          console.error("invalidate setup cache failed", cacheError);
        }
      } catch {
        if (latestSnapshot.current === nextSnapshot) {
          if (lastQueuedSnapshot.current === nextSnapshot) lastQueuedSnapshot.current = "";
          setFailedSnapshot(nextSnapshot);
          setSaveStatus("error");
          toast.error("Das Setup konnte nicht automatisch gespeichert werden.", { id: "setup-autosave-error" });
        }
      }
    });
  }, [invalidateSetupData, userId]);

  const saveNow = useCallback((nextPayload: SetupInput) => {
    if (!setupSchema.safeParse(nextPayload).success) return;
    const nextSnapshot = JSON.stringify(nextPayload);
    latestSnapshot.current = nextSnapshot;
    if (nextSnapshot !== lastQueuedSnapshot.current) enqueueSave(nextPayload, nextSnapshot);
  }, [enqueueSave]);

  const commitDiscreteChange = useCallback((nextPayload: SetupInput) => {
    if (!editing) saveNow(nextPayload);
  }, [editing, saveNow]);

  useEffect(() => {
    latestSnapshot.current = snapshot;
    if (!valid || editing || snapshot === lastQueuedSnapshot.current) return;
    const timer = window.setTimeout(() => enqueueSave(payload, snapshot), 500);
    return () => window.clearTimeout(timer);
  }, [editing, enqueueSave, payload, snapshot, valid]);

  const retry = useCallback(() => {
    if (valid && !editing) saveNow(payload);
  }, [editing, payload, saveNow, valid]);

  useEffect(() => {
    if (failedSnapshot !== snapshot) return;
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [failedSnapshot, retry, snapshot]);

  const status: SetupSaveStatus = !valid
    ? "invalid"
    : failedSnapshot === snapshot
      ? "error"
      : saveStatus === "saving" || snapshot !== lastSavedSnapshot
        ? "saving"
        : "saved";

  return { status, retry, saveNow, commitDiscreteChange };
}
