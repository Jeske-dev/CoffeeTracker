import { describe, expect, it } from "vitest";
import type { Bean, Equipment, Shot, UserSettings } from "@/types/domain";
import { createShotDefaults, createShotEditDefaults, groupShotEquipment, prepareShotSubmission, restoreShotDraft, stepGrindSetting, stepNumericValue } from "./form-model";

const bean = { id: "bean-a", archived_at: null } as Bean;
const shot = {
  bean_id: bean.id,
  machine_id: "machine-a",
  grinder_id: "grinder-a",
  basket_id: "basket-a",
  grind_setting: "5.2",
  dose_grams: 18,
  prep_tools: ["WDT", "Legacy"],
  stop_weight_grams: 34,
  final_yield_grams: 36,
} as Shot;
const settings = {
  last_bean_id: bean.id,
  default_machine_id: "machine-default",
  default_grinder_id: "grinder-default",
  default_prep_tools: ["Tamper", "Legacy"],
} as UserSettings;

describe("Shot-Formularmodell", () => {
  it("baut stabile Create-Defaults aus Einstellungen und letztem Shot", () => {
    const defaults = createShotDefaults({ beans: [bean], settings, lastShot: shot });
    expect(defaults).toMatchObject({
      beanId: bean.id,
      machineId: "machine-default",
      grinderId: "grinder-default",
      basketId: "basket-a",
      grindSetting: "5.2",
      doseGrams: 18,
      prepTools: ["Tamper"],
    });
  });

  it("übernimmt aus einem Draft keine veralteten Setup- oder Empfehlungsdaten", () => {
    const defaults = createShotDefaults({ beans: [bean], settings, lastShot: shot });
    const restored = restoreShotDraft(defaults, {
      ...defaults,
      machineId: "stale-machine",
      prepTools: ["WDT"],
      recommendationBundleId: "22222222-2222-4222-8222-222222222222",
      recommendationApplied: true,
      experimentMode: true,
    });
    expect(restored.machineId).toBe("machine-default");
    expect(restored.prepTools).toEqual(["WDT"]);
    expect(restored.recommendationBundleId).toBeNull();
    expect(restored.recommendationApplied).toBe(false);
    expect(restored.experimentMode).toBe(false);
  });

  it("protokolliert nur Dosis, Mahlgrad und Stop-Gewicht als manuelle Rezeptänderungen", () => {
    const defaults = createShotDefaults({ beans: [bean], settings, lastShot: shot });
    const submitted = prepareShotSubmission({ ...defaults, doseGrams: 17.5, finalYieldGrams: 40, prepTools: ["WDT"] }, defaults);
    expect(submitted.recommendationChanges).toEqual([{ field: "doseGrams", previousValue: 18, recommendedValue: 17.5, actualValue: 17.5, manual: true }]);
  });

  it("gruppiert Equipment in einem Durchlauf und behält ausgewählte archivierte Geräte", () => {
    const equipment = [
      { id: "machine-a", type: "machine", archived_at: "2026-01-01" },
      { id: "machine-b", type: "machine", archived_at: "2026-01-01" },
      { id: "grinder-a", type: "grinder", archived_at: null },
      { id: "tool-a", type: "tool", archived_at: null },
    ] as Equipment[];
    const groups = groupShotEquipment(equipment, shot);
    expect(groups.machines.map((item) => item.id)).toEqual(["machine-a"]);
    expect(groups.grinders.map((item) => item.id)).toEqual(["grinder-a"]);
    expect(groups.baskets).toEqual([]);
  });

  it("akzeptiert beim Mahlen auch ein deutsches Dezimalkomma", () => {
    expect(stepGrindSetting("5,2", -0.1)).toBe("5.1");
  });

  it("stellt numerische Rezeptwerte in Zehntelschritten ein und unterschreitet null nicht", () => {
    expect(stepNumericValue(18, 0.1)).toBe(18.1);
    expect(stepNumericValue(18.1, -0.1)).toBe(18);
    expect(stepNumericValue(0, -0.1)).toBe(0);
  });

  it("behält beim Bearbeiten den ursprünglichen Ziel-Snapshot", () => {
    const target = { doseGrams: 18, targetYieldGrams: 36 };
    expect(createShotEditDefaults({ ...shot, target_recipe_snapshot: target }).targetRecipeSnapshot).toEqual(target);
  });
});
