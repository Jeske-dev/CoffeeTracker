import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div>
    <div className="mb-5 flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-9 w-36"/><Skeleton className="h-3 w-48"/></div><Skeleton className="h-10 w-24"/></div>
    {[3, 2, 3].map((rows, section) => <section key={section} className="mb-3 overflow-hidden border bg-white p-4"><Skeleton className="mb-4 h-3 w-32"/>{Array.from({ length: rows }, (_, row) => <div key={row} className="flex h-[66px] items-center gap-3 border-t"><Skeleton className="size-[39px]"/><div className="flex-1 space-y-2"><Skeleton className="h-3 w-28"/><Skeleton className="h-2 w-40"/></div><Skeleton className="h-8 w-24"/></div>)}</section>)}
  </div>;
}
