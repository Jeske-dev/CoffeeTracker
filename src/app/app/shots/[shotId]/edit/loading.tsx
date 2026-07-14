import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="fixed inset-0 z-50 grid grid-rows-[auto_auto_1fr_auto] bg-[var(--dialed-surface)] min-[561px]:absolute">
    <header className="flex items-center justify-between border-b border-black px-6 pt-[calc(16px+env(safe-area-inset-top))] pb-4"><Skeleton className="size-11"/><Skeleton className="h-7 w-36"/><span className="w-11"/></header>
    <div className="flex justify-between border-b border-black px-6 py-3"><Skeleton className="h-2.5 w-28"/><Skeleton className="h-2.5 w-24"/></div>
    <div className="px-6 py-6"><Skeleton className="mb-2 h-8 w-52"/><Skeleton className="mb-5 h-3 w-full max-w-md"/><Skeleton className="mb-3 h-28"/><Skeleton className="mb-3 h-64"/><Skeleton className="h-56"/></div>
    <footer className="flex gap-2 border-t border-black px-6 py-3"><Skeleton className="h-12 flex-1"/><Skeleton className="h-12 flex-1"/></footer>
  </div>;
}
