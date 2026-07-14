// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readShotDraft, removeShotDraft, shotDraftKey, writeShotDraft } from "./shot-draft";
import type { ShotInput } from "./validation";

const values: ShotInput = {
  beanId: "11111111-1111-4111-8111-111111111111",
  machineId: null,
  grinderId: null,
  basketId: null,
  grindSetting: "5.2",
  doseGrams: 18,
  prepTools: ["WDT"],
  extractionSeconds: 28,
  stopWeightGrams: 34,
  finalYieldGrams: 36,
  taste: "balanced",
  flow: "even",
  puck: "ideal",
  notes: null,
  overallTasteRating: 3,
  targetRecipeSnapshot: null,
  recommendationBundleId: null,
  recommendationApplied: false,
  recommendationChanges: [],
  experimentMode: false,
};

describe("Shot-Entwurf", () => {
  beforeEach(() => window.localStorage.clear());

  it("speichert und validiert einen vollständigen Entwurf", () => {
    expect(writeShotDraft("user-a", 2, values)).toBe(true);
    expect(readShotDraft("user-a")).toMatchObject({ version: 2, step: 2, values });
  });

  it("ignoriert manipulierte oder veraltete Entwürfe", () => {
    window.localStorage.setItem(shotDraftKey("user-a"), JSON.stringify({ version: 2, step: 4, values: { ...values, doseGrams: -1 } }));
    expect(readShotDraft("user-a")).toBeNull();
  });

  it("behandelt verweigerten Storage-Zugriff als best effort", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("denied"); });
    expect(writeShotDraft("user-a", 1, values)).toBe(false);
    setItem.mockRestore();

    window.localStorage.setItem(shotDraftKey("user-a"), JSON.stringify({ version: 2, step: 1, values }));
    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new DOMException("denied"); });
    expect(() => removeShotDraft("user-a")).not.toThrow();
    removeItem.mockRestore();
  });
});
