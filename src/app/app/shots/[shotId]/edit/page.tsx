import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { requireUser } from "@/lib/supabase/auth";
import { loadEditShotData } from "@/features/data/queries";
import { ShotEditForm } from "@/components/shots/shot-edit-form";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";
import { formatDateTime } from "@/lib/formatting";
import { Button } from "@/components/ui/button";

export default async function EditShotPage({ params }: PageProps<"/app/shots/[shotId]/edit">) {
  const { shotId } = await params;
  const { supabase, userId } = await requireUser();
  const { shot, beans, equipment } = await loadEditShotData(userId, shotId, supabase);
  if (!shot) notFound();
  const selectedBean = beans.find((bean) => bean.id === shot.bean_id) ?? null;
  return <div className="fixed inset-0 z-50 grid h-dvh max-h-dvh grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[var(--dialed-surface)] min-[561px]:absolute min-[561px]:h-full">
    <header className="grid grid-cols-[44px_46px_minmax(0,1fr)_44px] items-center gap-3 border-b border-black bg-white px-6 pt-[calc(16px+env(safe-area-inset-top))] pb-4">
      <Link href={`/app/shots/${shot.id}`} aria-label="Zurück" className="grid size-11 place-items-center border border-black bg-white hover:bg-black hover:text-white"><ArrowLeft className="size-4" /></Link>
      <EntityIconFrame size="lg"><BeanIcon origin={selectedBean?.origin} className="text-[22px] [&_svg]:size-5" /></EntityIconFrame>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-[var(--dialed-text-muted)] uppercase">Shot bearbeiten</p>
        <h1 className="truncate font-display text-[22px] font-semibold">{selectedBean?.name ?? "Shot"}</h1>
        <p className="mt-0.5 truncate text-xs text-[var(--dialed-text-secondary)]">{formatDateTime(shot.shot_at)}</p>
      </div>
      <Button type="submit" form="shot-edit-form" size="icon-lg" aria-label="Shot speichern" title="Shot speichern"><Check /></Button>
    </header>
    <div className="relative h-full min-h-0 overflow-hidden"><ShotEditForm userId={userId} shot={shot} beans={beans} equipment={equipment} /></div>
  </div>;
}
