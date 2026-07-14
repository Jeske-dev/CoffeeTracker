import { describe, expect, it } from "vitest";
import { beanSchema, shotSchema } from ".";

const valid = {
  beanId: "00000000-0000-4000-8000-000000000001",
  machineId: null,
  grinderId: null,
  basketId: null,
  grindSetting: "2.4",
  doseGrams: 19,
  prepTools: ["WDT"],
  extractionSeconds: 28.5,
  stopWeightGrams: 34,
  finalYieldGrams: 36,
  taste: "balanced",
  flow: "even",
  puck: "ideal",
  notes: "",
  overallTasteRating: 4,
} as const;

describe("vereinfachte Shot-Validierung", () => {
  it("akzeptiert einen Shot ohne Legacy-Felder", () => expect(shotSchema.safeParse(valid).success).toBe(true));

  it("lässt Geschmack und Stop-Gewicht optional", () => {
    expect(shotSchema.safeParse({ ...valid, taste: null, overallTasteRating: null, stopWeightGrams: null }).success).toBe(true);
  });

  it("verlangt Dosis und finales Getränkgewicht", () => {
    expect(shotSchema.safeParse({ ...valid, doseGrams: undefined }).success).toBe(false);
    expect(shotSchema.safeParse({ ...valid, finalYieldGrams: undefined }).success).toBe(false);
  });

  it("blockiert finales Gewicht unter Stop-Gewicht", () => {
    const result = shotSchema.safeParse({ ...valid, finalYieldGrams: 33 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toContain("Stop-Gewicht");
  });

  it("entfernt alte Diagnosewerte aus dem validierten Ergebnis", () => {
    const result = shotSchema.safeParse({ ...valid, tampLevel: "slanted", pressureBar: 9, astringencySeverity: 4 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("tampLevel");
      expect(result.data).not.toHaveProperty("pressureBar");
      expect(result.data).not.toHaveProperty("astringencySeverity");
    }
  });
});

describe("Bohnen-Validierung", () => {
  it("erlaubt ein nicht angegebenes Röstdatum", () => {
    const result = beanSchema.safeParse({ name: "Test", roaster: "Rösterei", roastDate: "", origin: "", process: "unknown", roastLevel: null, tastingNotes: "", purchaseDate: "", priceEuros: null, packageGrams: null, isDecaf: false });
    expect(result.success).toBe(true);
  });
});
