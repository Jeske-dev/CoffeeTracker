import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-[var(--dialed-surface)] min-[561px]:absolute">
    <header className="grid grid-cols-[44px_1fr_44px] items-center border-b border-black px-6 pt-[calc(16px+env(safe-area-inset-top))] pb-4"><Skeleton className="size-11"/><Skeleton className="mx-auto h-7 w-28"/></header>
    <div className="px-6 py-6"><Skeleton className="mb-2 h-8 w-64"/><Skeleton className="mb-5 h-3 w-72 max-w-full"/>{[140,190,150].map((height)=><Skeleton key={height} className="mb-3" style={{height}}/>)}</div>
    <footer className="flex gap-2 border-t border-black px-6 py-3"><Skeleton className="h-12 flex-1"/><Skeleton className="h-12 flex-1"/></footer>
  </div>;
}
