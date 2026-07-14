export const PREP_TOOLS = ["WDT", "Tamper", "Puck Screen", "Leveler", "Papierfilter"] as const;

export type PrepTool = (typeof PREP_TOOLS)[number];

const prepToolSet: ReadonlySet<string> = new Set(PREP_TOOLS);

export function isPrepTool(value: unknown): value is PrepTool {
  return typeof value === "string" && prepToolSet.has(value);
}

export function normalizePrepTools(values: readonly string[] | null | undefined): PrepTool[] {
  return values?.filter(isPrepTool) ?? [];
}

export function togglePrepTool(values: readonly PrepTool[], tool: PrepTool): PrepTool[] {
  return values.includes(tool) ? values.filter((value) => value !== tool) : [...values, tool];
}
