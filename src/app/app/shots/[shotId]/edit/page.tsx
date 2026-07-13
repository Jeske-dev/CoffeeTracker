import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/supabase/auth";
import { loadAppData } from "@/features/data/queries";
import { ShotEditForm } from "@/components/shots/shot-edit-form";
import { formatDateTime } from "@/lib/formatting";

export default async function EditShotPage({ params }: PageProps<"/app/shots/[shotId]/edit">) {
  const { shotId } = await params;
  const { userId } = await requireUser();
  const { shots, beans, equipment } = await loadAppData(userId);
  const shot = shots.find((item) => item.id === shotId);
  if (!shot) notFound();
  return <div className="fixed inset-0 z-50 grid grid-rows-[auto_auto_1fr] bg-[var(--dialed-surface)] min-[561px]:absolute">
    <header className="flex items-center justify-between border-b px-[18px] pt-[calc(16px+env(safe-area-inset-top))] pb-3"><Link href={`/app/shots/${shot.id}`} aria-label="Zurück" className="grid size-[38px] place-items-center rounded-full bg-[var(--dialed-surface-subtle)]"><ArrowLeft className="size-4" /></Link><h1 className="font-display text-[22px]">Shot bearbeiten</h1><span className="w-[38px]" /></header>
    <div className="flex items-center justify-between border-b px-[18px] py-3 text-[10px] text-[var(--dialed-text-muted)]"><span>{shot.beans?.name ?? "Shot"}</span><span>{formatDateTime(shot.shot_at)}</span></div>
    <div className="relative min-h-0"><ShotEditForm shot={shot} beans={beans} equipment={equipment} /></div>
  </div>;
}
