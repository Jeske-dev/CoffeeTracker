"use client";

import { Check, Lightbulb, Undo2, X } from "lucide-react";

export function RecommendationFieldHint({
  text,
  state = "note",
  pending = false,
  onApply,
  onUndo,
  onDismiss,
}: {
  text: string;
  state?: "suggested" | "applied" | "note";
  pending?: boolean;
  onApply?: () => void;
  onUndo?: () => void;
  onDismiss?: () => void;
}) {
  return <div className="mt-1.5 rounded-[14px] border border-[var(--dialed-sage)]/20 bg-[var(--dialed-sage-soft)]/50 p-2.5 text-[10px] text-[var(--dialed-text-secondary)]">
    <div className="flex items-start gap-2">
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[8px] font-extrabold text-[var(--dialed-sage)]"><Lightbulb className="size-3" />Tipp</span>
      <p className="min-w-0 flex-1 pt-0.5 leading-4">{text}</p>
    </div>
    {state !== "note" && <div className="mt-1.5 flex justify-end gap-1.5">
      {state === "suggested" && <>
        <button type="button" disabled={pending} onClick={onApply} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 font-bold text-[var(--dialed-sage)]"><Check className="size-3.5" />Übernehmen</button>
        <button type="button" disabled={pending} onClick={onDismiss} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[var(--dialed-text-muted)]"><X className="size-3.5" />Ausblenden</button>
      </>}
      {state === "applied" && <button type="button" disabled={pending} onClick={onUndo} aria-label="Tipp rückgängig" className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 font-bold text-[var(--dialed-sage)]"><Undo2 className="size-3.5" />Rückgängig</button>}
    </div>}
  </div>;
}
