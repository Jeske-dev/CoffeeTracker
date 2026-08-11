"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FilePenLine, Trash2 } from "lucide-react";
import { formatClockTime } from "@/lib/formatting";
import { readShotDraft, removeShotDraft, type StoredShotDraft } from "@/lib/shot-draft";
import type { Bean } from "@/types/domain";

type BeanPreview = Pick<Bean, "id" | "name">;

export function ShotDraftCard({ userId, beans }: { userId: string; beans: BeanPreview[] }) {
  const [draft, setDraft] = useState<StoredShotDraft | null>(null);

  useEffect(() => {
    const update = () => setDraft(readShotDraft(userId));
    update();
    window.addEventListener("storage", update);
    window.addEventListener("dialed:shot-draft-updated", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("dialed:shot-draft-updated", update);
    };
  }, [userId]);

  if (!draft) return null;
  const bean = beans.find((item) => item.id === draft.values.beanId);
  const stepLabel = ["Setup", "Extraktion", "Review"][draft.step - 1];

  return <article className="mb-4 border border-black bg-[var(--crema-surface-mid)] p-4">
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center border border-black bg-white text-black"><FilePenLine className="size-5"/></span>
      <div className="min-w-0 flex-1"><span className="text-[9px] font-semibold tracking-[.1em] text-black uppercase">Gespeicherter Entwurf · {stepLabel}</span><h2 className="mt-1 truncate font-display text-lg font-semibold">{bean?.name ?? "Neuer Shot"}</h2><p className="mt-1 text-[10px] text-[var(--dialed-text-muted)]">Zuletzt gespeichert: {formatClockTime(draft.updatedAt)} Uhr</p></div>
    </div>
    <div className="mt-4 flex gap-2"><Link href="/app/shots/new" className="inline-flex min-h-11 flex-1 items-center justify-center border border-black bg-black px-4 text-[10px] font-semibold tracking-[.1em] text-white uppercase">Weiter bearbeiten</Link><button type="button" aria-label="Shot-Entwurf löschen" onClick={() => removeShotDraft(userId)} className="grid size-11 place-items-center border border-[var(--crema-error)] bg-white text-[var(--dialed-rose)]"><Trash2 className="size-4"/></button></div>
  </article>;
}
