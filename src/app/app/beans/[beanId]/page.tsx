import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/supabase/auth";
import { loadBeanDetailData } from "@/features/data/queries";
import { roastAgeDays } from "@/lib/calculations";
import { BeanForm } from "@/components/beans/bean-form";
import { ArchiveButton } from "@/components/beans/archive-button";

export default async function BeanDetail({ params }: PageProps<"/app/beans/[beanId]">) {
  const { beanId } = await params; const { supabase, userId } = await requireUser(); const { bean, shots: beanShots } = await loadBeanDetailData(userId, beanId, supabase);
  if (!bean) notFound();
  const best = beanShots[0];
  return <div className="fixed inset-0 z-50 grid grid-rows-[auto_auto_1fr] bg-[var(--dialed-surface)] min-[561px]:absolute"><header className="flex items-center justify-between border-b px-[18px] pt-[calc(16px+env(safe-area-inset-top))] pb-3"><Link href="/app/beans" aria-label="Zurück" className="grid size-[38px] place-items-center rounded-full bg-[var(--dialed-surface-subtle)]"><ArrowLeft className="size-4" /></Link><h1 className="font-display text-[22px]">Bohne bearbeiten</h1><span className="w-[38px]" /></header><div className="flex items-center justify-between border-b px-[18px] py-3 text-[10px] text-[var(--dialed-text-muted)]"><span>{bean.roast_date ? `${roastAgeDays(bean.roast_date)} Tage seit Röstung` : "Röstdatum nicht angegeben"} · {beanShots.length} Shots</span><span>{best ? `Bestes Rezept: ${best.score ?? "—"} Punkte` : "Noch kein Rezept"}</span></div><div className="relative min-h-0"><BeanForm userId={userId} bean={bean} archiveAction={<ArchiveButton userId={userId} id={bean.id} archived={Boolean(bean.archived_at)} />} /></div></div>;
}
