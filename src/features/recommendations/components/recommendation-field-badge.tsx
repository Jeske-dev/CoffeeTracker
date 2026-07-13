"use client";

import { RotateCcw, Sparkles } from "lucide-react";

export function RecommendationFieldBadge({ onUndo }: { onUndo: () => void }) {
  return <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-[var(--dialed-sage)]"><span className="inline-flex items-center gap-1 rounded-full bg-[var(--dialed-sage-soft)] px-2 py-1"><Sparkles className="size-3" />Empfohlen</span><button type="button" onClick={onUndo} aria-label="Empfehlung rückgängig" title="Rückgängig" className="grid size-7 place-items-center rounded-full bg-[var(--dialed-surface-subtle)]"><RotateCcw className="size-3" /></button></span>;
}
