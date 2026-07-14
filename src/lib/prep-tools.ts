export const PREP_TOOLS = ["WDT", "Tamper", "Puck Screen", "Leveler", "Papierfilter"] as const;

export type PrepTool = (typeof PREP_TOOLS)[number];
