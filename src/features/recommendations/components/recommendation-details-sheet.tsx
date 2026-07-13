"use client";

import { Info, LockKeyhole } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { RecommendationCandidate } from "../types";

export function RecommendationDetailsSheet({ primary }: { primary: RecommendationCandidate }) {
  return <Dialog>
    <DialogTrigger className="inline-flex min-h-9 items-center gap-1.5 text-[11px] font-bold text-[var(--dialed-text-secondary)]"><Info className="size-3.5" />Warum dieser Tipp?</DialogTrigger>
    <DialogContent className="max-h-[82dvh] overflow-y-auto rounded-[24px] p-5">
      <DialogHeader><DialogTitle className="font-display text-2xl">Warum dieser Tipp?</DialogTitle><DialogDescription className="leading-5">Beobachtung, Interpretation und genau eine Änderung.</DialogDescription></DialogHeader>
      <p className="text-xs leading-5 text-[var(--dialed-text-secondary)]">{primary.explanation}</p>
      <div className="grid gap-2">{primary.evidence.map((item) => <div key={`${item.label}-${item.value}`} className="grid grid-cols-[1fr_auto] gap-3 rounded-[14px] bg-[var(--dialed-surface-subtle)] px-3 py-2.5 text-xs"><span className="text-[var(--dialed-text-muted)]">{item.label}</span><strong className="text-right">{item.value}</strong></div>)}</div>
      <p className="flex items-start gap-2 text-[10px] leading-4 text-[var(--dialed-text-muted)]"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" />Deterministisch aus deinen Shot-Daten berechnet. Keine externe KI und keine universelle 25-Sekunden-Regel.</p>
    </DialogContent>
  </Dialog>;
}
