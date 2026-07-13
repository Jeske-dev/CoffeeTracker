import { z } from "zod";

const optionalNumber = (min: number, max: number) => z.union([z.number().min(min).max(max), z.null()]);
export const authSchema = z.object({ displayName: z.string().trim().min(2, "Bitte gib mindestens 2 Zeichen ein.").max(80).optional(), email: z.email("Bitte gib eine gültige E-Mail-Adresse ein."), password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen haben.") });
export const beanSchema = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(1, "Der Bohnenname fehlt.").max(120), roaster: z.string().trim().min(1, "Die Rösterei fehlt.").max(120),
  roastDate: z.union([z.literal(""), z.string().date("Bitte wähle ein gültiges Röstdatum.")]), origin: z.string().trim().max(120).optional(), process: z.enum(["washed", "natural", "honey", "anaerobic", "unknown"]),
  roastLevel: z.enum(["light", "medium_light", "medium", "dark"]).nullable(), tastingNotes: z.string().max(500).optional(), purchaseDate: z.string().optional(),
  priceEuros: optionalNumber(0, 10000), packageGrams: optionalNumber(1, 100000), isDecaf: z.boolean(),
});
export const shotSchema = z.object({
  beanId: z.string().uuid("Bitte wähle eine Bohne."), machineId: z.string().uuid().nullable(), grinderId: z.string().uuid().nullable(), basketId: z.string().uuid().nullable(),
  grindSetting: z.string().trim().min(1).max(40).nullable(), doseGrams: z.union([z.number().positive("Die Dosis muss größer als 0 sein.").max(100), z.null()]), temperatureC: optionalNumber(50, 110),
  preinfusionSeconds: optionalNumber(0, 120), prepTools: z.union([z.array(z.string().max(50)).max(20), z.null()]), extractionSeconds: z.union([z.number().positive("Die Extraktionszeit muss größer als 0 sein.").max(300), z.null()]),
  stopWeightGrams: z.union([z.number().min(0).max(500), z.null()]), finalYieldGrams: z.union([z.number().positive().max(500), z.null()]),
  taste: z.enum(["very_sour", "sour", "balanced", "bitter", "very_bitter"]).nullable(), flow: z.enum(["even", "minor_channeling", "channeling", "spritzing"]).nullable(), puck: z.enum(["dry", "ideal", "wet", "stuck"]).nullable(), notes: z.string().trim().max(2000).nullable(),
  overallTasteRating: z.union([z.number().int().min(1).max(5), z.null()]), tds: optionalNumber(0.01, 20), flowEvenness: optionalNumber(0, 100), channeling: z.boolean().nullable(),
  firstDropSeconds: optionalNumber(0, 300).optional(), pressureBar: optionalNumber(0.1, 20).optional(), tasteBalance: z.union([z.number().int().min(-2).max(2), z.null()]).optional(),
  astringencySeverity: z.union([z.number().int().min(0).max(4), z.null()]).optional(), channelingSeverity: z.union([z.number().int().min(0).max(4), z.null()]).optional(),
  sprayingSeverity: z.union([z.number().int().min(0).max(4), z.null()]).optional(), flowEvennessRating: z.union([z.number().int().min(1).max(5), z.null()]).optional(),
  earlyBlondingSeverity: z.union([z.number().int().min(0).max(4), z.null()]).optional(), puckDamageSeverity: z.union([z.number().int().min(0).max(4), z.null()]).optional(),
  showerScreenImprint: z.boolean().nullable().optional(), puckScreenImprint: z.boolean().nullable().optional(), strengthPerception: z.union([z.number().int().min(-2).max(2), z.null()]).optional(),
  tampLevel: z.enum(["level", "slanted"]).nullable().optional(), targetRecipeSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  recommendationBundleId: z.string().uuid().nullable().optional(), recommendationApplied: z.boolean().optional(), recommendationChanges: z.array(z.object({ field: z.string(), previousValue: z.unknown(), recommendedValue: z.unknown(), actualValue: z.unknown().optional(), unit: z.string().optional(), manual: z.boolean().optional() })).optional(), experimentMode: z.boolean().optional(),
}).refine((value) => value.finalYieldGrams === null || value.stopWeightGrams === null || value.finalYieldGrams >= value.stopWeightGrams, { path: ["finalYieldGrams"], message: "Das finale Gewicht darf nicht kleiner als das Stop-Gewicht sein." });
export const shotEditSchema = shotSchema.extend({ shotAt: z.string().min(1, "Bitte gib einen Zeitpunkt an.").refine((value) => !Number.isNaN(Date.parse(value)), "Bitte gib einen gültigen Zeitpunkt an.") });
export type BeanInput = z.infer<typeof beanSchema>;
export type ShotInput = z.infer<typeof shotSchema>;
export type ShotEditInput = z.infer<typeof shotEditSchema>;
