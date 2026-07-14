import { X } from "lucide-react";
import Link from "next/link";
import { BeanForm } from "@/components/beans/bean-form";
import { requireUser } from "@/lib/supabase/auth";

export default async function NewBeanPage() {
  const { userId } = await requireUser();
  return <div className="fixed inset-0 z-50 grid grid-rows-[auto_1fr] bg-[var(--dialed-surface)] min-[561px]:absolute"><header className="grid grid-cols-[44px_1fr_44px] items-center border-b border-black px-6 pt-[calc(16px+env(safe-area-inset-top))] pb-4"><Link href="/app/beans" aria-label="Schließen" className="grid size-11 place-items-center border border-black bg-white hover:bg-black hover:text-white"><X className="size-4"/></Link><h1 className="text-center font-display text-[22px] font-semibold">Neue Bohne</h1></header><BeanForm userId={userId}/></div>;
}
