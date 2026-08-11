import type { Bean, ShotSummary } from "@/types/domain";

export type ShotsPayload = {
  shots: ShotSummary[];
  beans: Pick<Bean, "id" | "name" | "roaster" | "roast_date" | "origin">[];
};

export type BeansPayload = {
  beans: Bean[];
  lastBeanId: string | null;
  shotCounts: Record<string, number>;
};
