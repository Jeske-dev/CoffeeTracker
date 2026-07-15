import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)] bg-[var(--dialed-surface)] min-[561px]:absolute">
    <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 border-b border-black bg-white px-6 pt-[calc(16px+env(safe-area-inset-top))] pb-4"><Skeleton className="size-11"/><Skeleton className="mx-auto h-7 w-28"/><Skeleton className="size-11"/></header>
    <div className="min-h-0 overflow-hidden px-6 py-6"><Skeleton className="mb-2 h-8 w-64"/><Skeleton className="mb-5 h-3 w-72 max-w-full"/>{[140,250,250,150].map((height, index)=><Skeleton key={`${height}-${index}`} className="mb-3" style={{height}}/>)}</div>
  </div>;
}
