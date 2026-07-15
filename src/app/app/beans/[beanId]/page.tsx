import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Coffee } from "lucide-react";
import { requireUser } from "@/lib/supabase/auth";
import { loadBeanDetailData } from "@/features/data/queries";
import { roastAgeDays } from "@/lib/calculations";
import { BeanForm } from "@/components/beans/bean-form";
import { ArchiveButton } from "@/components/beans/archive-button";
import { BeanIcon, EntityIconFrame } from "@/components/entities/entity-icons";

export default async function BeanDetail({ params }: PageProps<"/app/beans/[beanId]">) {
  const { beanId } = await params; const { supabase, userId } = await requireUser(); const { bean, shots: beanShots } = await loadBeanDetailData(userId, beanId, supabase);
  if (!bean) notFound();
  return <div className="fixed inset-0 z-50 grid grid-rows-[auto_auto_minmax(0,1fr)] bg-[var(--dialed-surface)] min-[561px]:absolute">
    <header className="grid grid-cols-[44px_46px_minmax(0,1fr)] items-center gap-3 border-b border-black bg-white px-6 pt-[calc(16px+env(safe-area-inset-top))] pb-4">
      <Link href="/app/beans" aria-label="Zurück" className="grid size-11 place-items-center border border-black bg-white hover:bg-black hover:text-white"><ArrowLeft className="size-4" /></Link>
      <EntityIconFrame size="lg"><BeanIcon origin={bean.origin} className="text-[22px] [&_svg]:size-5" /></EntityIconFrame>
      <div className="min-w-0"><p className="text-[10px] font-semibold tracking-[.08em] text-[var(--dialed-text-muted)] uppercase">Bohne bearbeiten</p><h1 className="truncate font-display text-[22px] font-semibold">{bean.name}</h1><p className="mt-0.5 truncate text-xs text-[var(--dialed-text-secondary)]">{bean.roaster}</p></div>
    </header>
    <div className="grid grid-cols-2 divide-x border-b border-black px-6 py-3">
      <BeanFact icon={<CalendarDays />} label={bean.roast_date ? `${roastAgeDays(bean.roast_date)} Tage seit Röstung` : "Röstdatum offen"} />
      <BeanFact icon={<Coffee />} label={`${beanShots.length} ${beanShots.length === 1 ? "Shot" : "Shots"}`} />
    </div>
    <div className="relative h-full min-h-0 overflow-hidden"><BeanForm userId={userId} bean={bean} archiveAction={<ArchiveButton userId={userId} id={bean.id} archived={Boolean(bean.archived_at)} />} /></div>
  </div>;
}

function BeanFact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span className="flex min-w-0 items-center gap-2 px-2 first:pl-0 last:pr-0 [&_svg]:size-4"><span className="shrink-0 text-black">{icon}</span><span className="truncate text-xs text-[var(--dialed-text-secondary)]">{label}</span></span>;
}
