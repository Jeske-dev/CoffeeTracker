import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div>
    <header className="mb-5 flex items-center justify-between">
      <div className="space-y-2"><Skeleton className="h-9 w-44" /><Skeleton className="h-3 w-24" /></div>
      <Skeleton className="size-11" />
    </header>
    <div className="mb-3 flex justify-end"><Skeleton className="h-[52px] w-[98px]" /></div>
    <div className="grid gap-2.5">{Array.from({ length: 4 }, (_, item) => <Skeleton key={item} className="h-[210px] w-full sm:h-[164px]" />)}</div>
  </div>;
}
