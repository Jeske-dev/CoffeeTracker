"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Gauge, HelpCircle, Lightbulb, Play, Scale, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyRecommendation, dismissRecommendation } from "@/features/data/actions";
import { usePrivateCache } from "@/hooks/use-private-cache";
import type { RecommendationBundleRecord } from "@/types/domain";
import type { ExecutionAdjustment, RecipeSnapshot, RecommendationCandidate } from "../types";

export function NextShotCard({
  recommendation,
  beanName,
  compact = false,
}: {
  recommendation: RecommendationBundleRecord;
  beanName?: string;
  sourceShotId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { invalidateRecommendationData } = usePrivateCache();
  const [hidden, setHidden] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const primary = recommendation.primary_action as unknown as RecommendationCandidate;
  const stop = recommendation.execution_adjustments as unknown as ExecutionAdjustment | null;
  const recipe = recommendation.target_recipe_snapshot as unknown as RecipeSnapshot | null;
  const primaryChange = primary.changes[0];
  const targetDose = primaryChange?.field === "doseGrams" && typeof primaryChange.recommendedValue === "number"
    ? primaryChange.recommendedValue
    : recipe?.doseGrams;
  const targetYield = primaryChange?.field === "targetYieldGrams" && typeof primaryChange.recommendedValue === "number"
    ? primaryChange.recommendedValue
    : recipe?.targetYieldGrams;
  if (hidden || recommendation.status === "dismissed") return null;

  const startWithTip = () => startTransition(async () => {
    const result = await applyRecommendation(recommendation.id);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    await invalidateRecommendationData(recommendation.user_id);
    router.push(`/app/shots/new?recommendation=${recommendation.id}`);
  });
  const dismiss = () => {
    setHidden(true);
    startTransition(async () => {
      const result = await dismissRecommendation(recommendation.id);
      if (!result.ok) {
        setHidden(false);
        toast.error(result.message);
        return;
      }
      await invalidateRecommendationData(recommendation.user_id);
    });
  };

  return <section className={`relative border border-[var(--dialed-sage)]/20 bg-[var(--dialed-sage-soft)]/55 ${compact ? "rounded-[20px] p-4" : "mt-3 rounded-[24px] p-4 shadow-[var(--shadow-sm)]"}`}>
    <button type="button" disabled={pending} onClick={dismiss} aria-label="Tipp ausblenden" title="Tipp ausblenden" className="absolute right-2.5 top-2.5 grid size-11 place-items-center rounded-full text-[var(--dialed-text-muted)]"><X className="size-4" /></button>
    <div className="flex items-start gap-3 pr-9">
      <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-white text-[var(--dialed-sage)]"><Lightbulb className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-[var(--dialed-sage)]">Tipp für deinen nächsten Shot</span><span className="rounded-full bg-white/80 px-2 py-1 text-[8px] font-bold text-[var(--dialed-text-muted)]">{recommendation.confidence_label}</span></div>
        {beanName && <p className="mt-1 text-[10px] text-[var(--dialed-text-muted)]">{beanName}</p>}
        <h2 className="mt-1.5 text-[15px] font-extrabold leading-5">{primary.title}</h2>
        <p className="mt-1 text-[11px] leading-[1.55] text-[var(--dialed-text-secondary)]">{primary.explanation}</p>
      </div>
    </div>
    {(targetDose != null || targetYield != null || stop) && <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
      {targetDose != null && <MiniMetric icon={Scale} label="Dosis" value={`${targetDose.toLocaleString("de-DE")} g`} />}
      {targetYield != null && <MiniMetric icon={Gauge} label="Ziel" value={`${targetYield.toLocaleString("de-DE")} g`} />}
      {stop && <MiniMetric icon={Play} label="Stop" value={`${stop.recommendedStopWeightGrams.toLocaleString("de-DE")} g`} />}
    </div>}
    {stop && <p className="mt-3 text-[10px] leading-4 text-[var(--dialed-text-muted)]">Für {targetYield?.toLocaleString("de-DE") ?? "das"} g finales Zielgewicht bei ungefähr {stop.recommendedStopWeightGrams.toLocaleString("de-DE")} g stoppen.</p>}
    {whyOpen && <div className="mt-3 border-t border-[var(--dialed-sage)]/15 pt-3"><p className="text-[10px] leading-4 text-[var(--dialed-text-secondary)]">{primary.summary}</p>{primary.evidence.slice(0, 2).map((item) => <p key={item.label} className="mt-1 text-[9px] text-[var(--dialed-text-muted)]"><strong>{item.label}:</strong> {item.value}</p>)}</div>}
    <div className="mt-3 flex gap-2">
      <Button type="button" disabled={pending} onClick={startWithTip} className="h-11 min-w-0 flex-1 rounded-full bg-[var(--dialed-espresso)] px-4 text-[11px] text-white"><Play className="size-4" /><span className="truncate">Shot mit Tipp starten</span><ArrowRight className="size-3.5" /></Button>
      <button type="button" aria-expanded={whyOpen} onClick={() => setWhyOpen((current) => !current)} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[10px] font-bold text-[var(--dialed-sage)]"><HelpCircle className="size-3.5" />Warum?</button>
    </div>
  </section>;
}

function MiniMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <span className="min-w-0 rounded-[12px] bg-white/75 px-2 py-2"><Icon className="mx-auto mb-1 size-3 text-[var(--dialed-crema)]" /><small className="block text-[8px] text-[var(--dialed-text-muted)]">{label}</small><strong className="block truncate text-[10px]">{value}</strong></span>;
}
