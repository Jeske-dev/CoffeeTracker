import { z } from "zod";

const optionalNumber = (min: number, max: number) => z.union([z.number().min(min).max(max), z.null()]);
export const authSchema = z.object({ displayName: z.string().trim().min(2, "Bitte gib mindestens 2 Zeichen ein.").max(80).optional(), email: z.email("Bitte gib eine gültige E-Mail-Adresse ein."), password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen haben.") });
export const beanSchema = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(1, "Der Bohnenname fehlt.").max(120), roaster: z.string().trim().min(1, "Die Rösterei fehlt.").max(120),
  roastDate: z.union([z.literal(""), z.string().date("Bitte wähle ein gültiges Röstdatum.")]), origin: z.string().trim().max(120).optional(), process: z.enum(["washed", "natural", "honey", "anaerobic", "unknown"]),
  roastLevel: z.enum(["light", "medium_light", "medium", "dark"]).nullable(), tastingNotes: z.string().max(500).optional(), purchaseDate: z.string().optional(),
  priceEuros: optionalNumber(0, 10000), packageGrams: optionalNumber(1, 100000), isDecaf: z.boolean(),
});
const recommendationChangeSchema = z.object({
  field: z.string(),
  previousValue: z.unknown(),
  recommendedValue: z.unknown(),
  actualValue: z.unknown().optional(),
  unit: z.string().optional(),
  manual: z.boolean().optional(),
});

const shotFields = {
  beanId: z.string().uuid("Bitte wähle eine Bohne."),
  machineId: z.string().uuid().nullable(),
  grinderId: z.string().uuid().nullable(),
  basketId: z.string().uuid().nullable(),
  grindSetting: z.string().trim().min(1).max(40).nullable(),
  doseGrams: z.number().positive("Bitte gib eine Dosis ein.").max(100),
  prepTools: z.union([z.array(z.enum(["WDT", "Puck Screen"])).max(2), z.null()]),
  extractionSeconds: optionalNumber(0.1, 300),
  stopWeightGrams: optionalNumber(0, 500),
  finalYieldGrams: z.number().positive("Bitte gib das finale Getränkgewicht ein.").max(500),
  taste: z.enum(["sour", "balanced", "bitter"]).nullable(),
  flow: z.enum(["even", "minor_channeling", "channeling"]).nullable(),
  puck: z.enum(["dry", "ideal", "wet", "stuck"]).nullable(),
  notes: z.string().trim().max(2000).nullable(),
  overallTasteRating: z.union([z.number().int().min(1).max(5), z.null()]),
  targetRecipeSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  recommendationBundleId: z.string().uuid().nullable().optional(),
  recommendationApplied: z.boolean().optional(),
  recommendationChanges: z.array(recommendationChangeSchema).optional(),
  experimentMode: z.boolean().optional(),
};

const validateStopWeight = <T extends z.ZodType<{ finalYieldGrams: number; stopWeightGrams: number | null }>>(schema: T) => schema.refine(
  (value) => value.stopWeightGrams === null || value.finalYieldGrams >= value.stopWeightGrams,
  { path: ["finalYieldGrams"], message: "Das finale Gewicht darf nicht kleiner als das Stop-Gewicht sein." },
);

export const shotSchema = validateStopWeight(z.object(shotFields));
export const shotEditSchema = validateStopWeight(z.object({
  ...shotFields,
  shotAt: z.string().min(1, "Bitte gib einen Zeitpunkt an.").refine((value) => !Number.isNaN(Date.parse(value)), "Bitte gib einen gültigen Zeitpunkt an."),
}));
export type BeanInput = z.infer<typeof beanSchema>;
export type ShotInput = z.infer<typeof shotSchema>;
export type ShotEditInput = z.infer<typeof shotEditSchema>;
