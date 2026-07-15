import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="fixed inset-0 z-50 grid h-dvh max-h-dvh grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[var(--dialed-surface)] min-[561px]:absolute min-[561px]:h-full">
    <header className="grid grid-cols-[44px_46px_minmax(0,1fr)_44px] items-center gap-3 border-b border-black bg-white px-6 pt-[calc(16px+env(safe-area-inset-top))] pb-4"><Skeleton className="size-11"/><Skeleton className="size-[46px]"/><div className="space-y-2"><Skeleton className="h-2.5 w-24"/><Skeleton className="h-6 w-36"/><Skeleton className="h-3 w-28"/></div><Skeleton className="size-11"/></header>
    <div className="min-h-0 overflow-hidden px-6 py-6"><Skeleton className="mb-3 h-80"/><Skeleton className="mb-3 h-64"/><Skeleton className="h-56"/></div>
  </div>;
}
