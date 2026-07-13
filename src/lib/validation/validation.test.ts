import { describe, expect, it } from "vitest";
import { beanSchema, shotSchema } from ".";

const valid = { beanId: "00000000-0000-4000-8000-000000000001", machineId: null, grinderId: null, basketId: null, grindSetting: "2.4", doseGrams: 19, temperatureC: 93, preinfusionSeconds: null, prepTools: ["WDT"], extractionSeconds: 28.5, stopWeightGrams: 34, finalYieldGrams: 36, taste: "balanced", flow: "even", puck: "ideal", notes: "", overallTasteRating: null, tds: null, flowEvenness: null, channeling: null } as const;
describe("Shot-Wizard-Validierung", () => {
  it("akzeptiert einen vollständigen Shot", () => expect(shotSchema.safeParse(valid).success).toBe(true));
  it("blockiert finales Gewicht unter Stop-Gewicht", () => { const result = shotSchema.safeParse({ ...valid, finalYieldGrams: 33 }); expect(result.success).toBe(false); if (!result.success) expect(result.error.issues[0].message).toContain("Stop-Gewicht"); });
  it("blockiert unplausible Temperatur und leeren Mahlgrad", () => expect(shotSchema.safeParse({ ...valid, temperatureC: 140, grindSetting: "" }).success).toBe(false));
});

describe("Bohnen-Validierung", () => {
  it("erlaubt ein nicht angegebenes Röstdatum", () => {
    const result = beanSchema.safeParse({ name: "Test", roaster: "Rösterei", roastDate: "", origin: "", process: "unknown", roastLevel: null, tastingNotes: "", purchaseDate: "", priceEuros: null, packageGrams: null, isDecaf: false });
    expect(result.success).toBe(true);
  });
});
