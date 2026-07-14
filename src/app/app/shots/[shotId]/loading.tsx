import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="pb-4">
    <div className="mb-5 flex items-center gap-3"><Skeleton className="size-11 rounded-full" /><Skeleton className="size-[46px] rounded-[15px]" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-full max-w-64" /><Skeleton className="h-3 w-40" /></div></div>
    <Skeleton className="h-[390px] rounded-[24px] sm:h-[305px]" />
    <Skeleton className="mt-3 h-[198px] rounded-[24px]" />
    <Skeleton className="mt-3 h-[98px] rounded-[22px]" />
    <Skeleton className="mt-3 h-[390px] rounded-[24px] sm:h-[250px]" />
    <Skeleton className="mt-3 h-[330px] rounded-[24px]" />
  </div>;
}
