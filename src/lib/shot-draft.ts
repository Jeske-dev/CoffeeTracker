import type { ShotInput } from "@/lib/validation";

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
    const value = JSON.parse(raw) as StoredShotDraft;
    return value?.version === 2 && value.values && value.step >= 1 && value.step <= 3 ? value : null;
  } catch {
    return null;
  }
}

export function writeShotDraft(userId: string, step: number, values: ShotInput) {
  if (typeof window === "undefined") return;
  const draft: StoredShotDraft = { version: 2, step: Math.min(3, Math.max(1, step)) as 1 | 2 | 3, values, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(shotDraftKey(userId), JSON.stringify(draft));
  window.dispatchEvent(new CustomEvent("dialed:shot-draft-updated"));
}

export function removeShotDraft(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(shotDraftKey(userId));
  window.dispatchEvent(new CustomEvent("dialed:shot-draft-updated"));
}
