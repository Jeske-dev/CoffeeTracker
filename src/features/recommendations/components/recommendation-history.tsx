"use client";

import { useTransition } from "react";
import { CheckCircle2, GitCompareArrows, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { rateRecommendation } from "@/features/data/actions";
import type { RecommendationBundleRecord } from "@/types/domain";
import type { RecommendationCandidate, RecommendationOutcome } from "../types";

export function RecommendationHistory({ recommendation }: { recommendation: RecommendationBundleRecord }) {
  const [pending, startTransition] = useTransition();
  const primary = recommendation.primary_action as unknown as RecommendationCandidate;
  const outcome = recommendation.outcome as unknown as RecommendationOutcome | null;
  const rate = (helpful: boolean) => startTransition(async () => { const result = await rateRecommendation(recommendation.id, helpful); if(result.ok)toast.success(result.message);else toast.error(result.message); });
  return <section className="mt-3 rounded-[22px] border bg-white p-4"><div className="flex items-center gap-2"><GitCompareArrows className="size-4 text-[var(--dialed-crema)]" /><h2 className="text-sm font-extrabold">Übernommener Tipp</h2></div><p className="mt-2 text-xs font-bold">{primary.title}</p><p className="mt-1 text-[10px] leading-4 text-[var(--dialed-text-muted)]">{recommendation.status === "completed" ? "Auf diesen Shot angewendet und mit dem vorherigen verglichen." : "Für einen nächsten Shot vorgemerkt."}</p>{outcome && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--dialed-sage-soft)] px-2.5 py-1.5 text-[9px] font-bold text-[var(--dialed-sage)]"><CheckCircle2 className="size-3" />{outcome.status === "successful" ? "Positiver Effekt" : outcome.status === "ambiguous" ? "Ergebnis nicht eindeutig" : outcome.status === "unsuccessful" ? "Kein positiver Effekt" : "Noch nicht auswertbar"}</p>}<div className="mt-3 flex items-center gap-2"><span className="mr-auto text-[10px] text-[var(--dialed-text-muted)]">War dieser Tipp hilfreich?</span><button type="button" disabled={pending} onClick={() => rate(true)} aria-label="Hilfreich" className="grid size-9 place-items-center rounded-full bg-[var(--dialed-sage-soft)] text-[var(--dialed-sage)]"><ThumbsUp className="size-3.5" /></button><button type="button" disabled={pending} onClick={() => rate(false)} aria-label="Nicht hilfreich" className="grid size-9 place-items-center rounded-full bg-[var(--dialed-rose-soft)] text-[var(--dialed-rose)]"><ThumbsDown className="size-3.5" /></button></div></section>;
}
