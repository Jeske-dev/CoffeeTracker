import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/supabase/auth";
import { loadEditShotData } from "@/features/data/queries";
import { ShotEditForm } from "@/components/shots/shot-edit-form";
import { formatDateTime } from "@/lib/formatting";

export default async function EditShotPage({ params }: PageProps<"/app/shots/[shotId]/edit">) {
  const { shotId } = await params;
  const { supabase, userId } = await requireUser();
  const { shot, beans, equipment } = await loadEditShotData(userId, shotId, supabase);
  if (!shot) notFound();
  const beanName = beans.find((bean) => bean.id === shot.bean_id)?.name ?? "Shot";
  return <div className="fixed inset-0 z-50 grid grid-rows-[auto_auto_1fr] bg-[var(--dialed-surface)] min-[561px]:absolute">
    <header className="flex items-center justify-between border-b border-black px-6 pt-[calc(16px+env(safe-area-inset-top))] pb-4"><Link href={`/app/shots/${shot.id}`} aria-label="Zurück" className="grid size-11 place-items-center border border-black bg-white hover:bg-black hover:text-white"><ArrowLeft className="size-4" /></Link><h1 className="font-display text-[22px] font-semibold">Shot bearbeiten</h1><span className="w-11" /></header>
    <div className="flex items-center justify-between border-b border-black px-6 py-3 text-[10px] font-semibold tracking-[.06em] text-[var(--dialed-text-muted)] uppercase"><span>{beanName}</span><span>{formatDateTime(shot.shot_at)}</span></div>
    <div className="relative min-h-0"><ShotEditForm userId={userId} shot={shot} beans={beans} equipment={equipment} /></div>
  </div>;
}
