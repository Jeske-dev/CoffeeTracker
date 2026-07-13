"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clock3, Gauge, Lightbulb, Minus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyRecommendation, dismissRecommendation, saveReferenceRecipe, suppressRecommendationSetup } from "@/features/data/actions";
import type { RecommendationBundleRecord } from "@/types/domain";
import type { ExecutionAdjustment, RecipeSnapshot, RecommendationCandidate } from "../types";
import { RecommendationDetailsSheet } from "./recommendation-details-sheet";

export function NextShotCard({ recommendation, beanName, sourceShotId, compact = false }: { recommendation: RecommendationBundleRecord; beanName?: string; sourceShotId?: string; compact?: boolean }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  const primary = recommendation.primary_action as unknown as RecommendationCandidate;
  const stop = recommendation.execution_adjustments as unknown as ExecutionAdjustment | null;
  const recipe = recommendation.target_recipe_snapshot as unknown as RecipeSnapshot | null;
  if (hidden || recommendation.status === "dismissed") return null;
  const apply = () => startTransition(async () => { const result = await applyRecommendation(recommendation.id); if (!result.ok) { toast.error(result.message); return; } toast.success(result.message); router.push(`/app/shots/new?recommendation=${recommendation.id}`); });
  const dismiss = () => startTransition(async () => { const result = await dismissRecommendation(recommendation.id); if (!result.ok) { toast.error(result.message); return; } setHidden(true); toast.success(result.message); router.refresh(); });
  const suppressSetup = () => startTransition(async () => { const result = await suppressRecommendationSetup(recommendation.id); if (!result.ok) { toast.error(result.message); return; } setHidden(true); toast.success(result.message); router.refresh(); });
  const reference = () => sourceShotId && startTransition(async () => { const result = await saveReferenceRecipe(sourceShotId); if(result.ok)toast.success(result.message);else toast.error(result.message); router.refresh(); });
  return <section className={`border border-[var(--dialed-sage)]/20 bg-[var(--dialed-sage-soft)]/55 ${compact ? "rounded-[20px] p-4" : "mt-3 rounded-[24px] p-4 shadow-[var(--shadow-sm)]"}`}>
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-white text-[var(--dialed-sage)]"><Lightbulb className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-[var(--dialed-sage)]">{compact ? "Dein nächster Shot" : "Nächster Shot"}</span><span className="rounded-full bg-white/80 px-2 py-1 text-[8px] font-bold text-[var(--dialed-text-muted)]">{recommendation.confidence_label}</span></div>{beanName && <p className="mt-1 text-[10px] text-[var(--dialed-text-muted)]">{beanName}</p>}<h2 className="mt-1.5 text-[15px] font-extrabold leading-5">{primary.title}</h2><p className="mt-1 text-[11px] leading-[1.55] text-[var(--dialed-text-secondary)]">{primary.summary}</p></div></div>
    {(recipe || stop) && <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">{recipe?.doseGrams != null && <MiniMetric icon={Gauge} label="Dosis" value={`${recipe.doseGrams.toLocaleString("de-DE")} g`} />}{recipe?.targetYieldGrams != null && <MiniMetric icon={Sparkles} label="Ziel" value={`${recipe.targetYieldGrams.toLocaleString("de-DE")} g`} />}{stop && <MiniMetric icon={Clock3} label="Stop" value={`${stop.recommendedStopWeightGrams.toLocaleString("de-DE")} g`} />}</div>}
    {stop && <p className="mt-3 text-[10px] leading-4 text-[var(--dialed-text-muted)]">Bei etwa {stop.recommendedStopWeightGrams.toLocaleString("de-DE")} g stoppen. Deine Maschine läuft geschätzt {stop.expectedOvershootGrams.toLocaleString("de-DE")} g nach.</p>}
    <div className="mt-3 flex flex-wrap items-center gap-2"><Button type="button" disabled={pending} onClick={apply} className="h-10 flex-1 rounded-full bg-[var(--dialed-espresso)] px-4 text-[11px] text-white"><Check className="size-4" />Übernehmen<ArrowRight className="size-3.5" /></Button><RecommendationDetailsSheet primary={primary} /></div>
    <div className="mt-1 flex flex-wrap gap-x-4"><button type="button" disabled={pending} onClick={() => setHidden(true)} className="inline-flex min-h-8 items-center gap-1 text-[10px] text-[var(--dialed-text-muted)]"><Clock3 className="size-3" />Später</button><button type="button" disabled={pending} onClick={dismiss} className="inline-flex min-h-8 items-center gap-1 text-[10px] text-[var(--dialed-text-muted)]"><Minus className="size-3" />Aktuelle Werte behalten</button>{primary.actionType === "KEEP_RECIPE" && sourceShotId && <button type="button" disabled={pending} onClick={reference} className="inline-flex min-h-8 items-center gap-1 text-[10px] font-bold text-[var(--dialed-sage)]"><Sparkles className="size-3" />Als Referenz speichern</button>}<button type="button" disabled={pending} onClick={suppressSetup} className="min-h-8 text-left text-[9px] text-[var(--dialed-text-muted)]">Nicht mehr für dieses Setup</button></div>
  </section>;
}

function MiniMetric({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) { return <span className="min-w-0 rounded-[12px] bg-white/75 px-2 py-2"><Icon className="mx-auto mb-1 size-3 text-[var(--dialed-crema)]" /><small className="block text-[8px] text-[var(--dialed-text-muted)]">{label}</small><strong className="block truncate text-[10px]">{value}</strong></span>; }
