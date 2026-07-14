import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-[var(--dialed-surface)] min-[561px]:absolute">
    <header className="grid grid-cols-[40px_1fr_40px] items-center border-b px-[18px] pt-[calc(16px+env(safe-area-inset-top))] pb-3"><Skeleton className="size-[38px] rounded-full"/><Skeleton className="mx-auto h-7 w-28"/></header>
    <div className="px-[18px] py-5"><Skeleton className="mb-2 h-8 w-64"/><Skeleton className="mb-5 h-3 w-72 max-w-full"/>{[140,190,150].map((height)=><Skeleton key={height} className="mb-3 rounded-[24px]" style={{height}}/>)}</div>
    <footer className="flex gap-2 border-t px-[18px] py-3"><Skeleton className="h-12 flex-1 rounded-full"/><Skeleton className="h-12 flex-1 rounded-full"/></footer>
  </div>;
}
