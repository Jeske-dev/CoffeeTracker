import { z } from "zod";
import { PREP_TOOLS } from "@/lib/prep-tools";

export const setupSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  machineName: z.string().trim().min(1).max(120),
  grinderName: z.string().trim().min(1).max(120),
  autoFill: z.boolean(),
  tools: z.array(z.enum(PREP_TOOLS)).max(PREP_TOOLS.length),
  suggestions: z.boolean(),
  roastWarning: z.boolean(),
  warningDays: z.number().int().min(1).max(365),
});

export type SetupInput = z.infer<typeof setupSchema>;
