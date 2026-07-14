import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="pb-4">
    <div className="mb-5 flex items-center gap-3"><Skeleton className="size-10 rounded-full"/><div className="space-y-2"><Skeleton className="h-2.5 w-32"/><Skeleton className="h-9 w-44"/></div></div>
    <Skeleton className="h-[190px] rounded-[28px]"/>
    <Skeleton className="mt-3 h-[118px] rounded-[22px]"/>
    <div className="mt-3 grid grid-cols-2 gap-2">{Array.from({length:6},(_,item)=><Skeleton key={item} className="h-[94px] rounded-[18px]"/>)}</div>
    <Skeleton className="mt-3 h-[280px] rounded-[24px]"/>
  </div>;
}
