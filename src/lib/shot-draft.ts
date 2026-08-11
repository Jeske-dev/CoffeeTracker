import { shotSchema, type ShotInput } from "@/lib/validation";

export type StoredShotDraft = {
  version: 2;
  step: 1 | 2 | 3;
  values: ShotInput;
  updatedAt: string;
};

export const shotDraftKey = (userId: string) => `dialed:shot-draft:${userId}`;

export function readShotDraft(userId: string): StoredShotDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(shotDraftKey(userId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredShotDraft>;
    const parsedValues = shotSchema.safeParse(value.values);
    const step = value.step;
    if (value.version !== 2 || (step !== 1 && step !== 2 && step !== 3) || !parsedValues.success) return null;
    return { version: 2, step, values: parsedValues.data, updatedAt: value.updatedAt ?? "" };
  } catch {
    return null;
  }
}

export function writeShotDraft(userId: string, step: number, values: ShotInput) {
  if (typeof window === "undefined") return false;
  try {
    const draft: StoredShotDraft = { version: 2, step: Math.min(3, Math.max(1, step)) as 1 | 2 | 3, values, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(shotDraftKey(userId), JSON.stringify(draft));
    window.dispatchEvent(new CustomEvent("dialed:shot-draft-updated"));
    return true;
  } catch {
    return false;
  }
}

export function removeShotDraft(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(shotDraftKey(userId));
    window.dispatchEvent(new CustomEvent("dialed:shot-draft-updated"));
  } catch {
    // Private browsing modes may deny storage access; deletion is best effort.
  }
}
