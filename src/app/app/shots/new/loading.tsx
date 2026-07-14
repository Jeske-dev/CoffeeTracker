import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-[var(--dialed-surface)] min-[561px]:absolute">
    <header className="border-b border-black px-6 pt-[calc(16px+env(safe-area-inset-top))] pb-4"><div className="grid grid-cols-[44px_1fr_44px] items-center"><Skeleton className="size-11"/><Skeleton className="mx-auto h-7 w-28"/></div><div className="mt-4 grid grid-cols-3 gap-px border border-black">{[0,1,2].map((item)=><Skeleton key={item} className="h-1.5"/>)}</div></header>
    <div className="px-6 py-6"><Skeleton className="mb-2 h-8 w-64"/><Skeleton className="mb-5 h-3 w-52"/><Skeleton className="mb-3 h-32"/><Skeleton className="mb-3 h-44"/><Skeleton className="h-24"/></div>
    <footer className="flex gap-2.5 border-t border-black px-6 py-3"><Skeleton className="h-12 flex-1"/><Skeleton className="h-12 flex-1"/></footer>
  </div>;
}
