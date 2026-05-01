import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-[110px]" />
        <Skeleton className="h-8 w-[140px]" />
        <Skeleton className="h-8 w-[90px]" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-[130px]" />
          <Skeleton className="h-8 w-[90px]" />
          <Skeleton className="h-8 w-[120px]" />
        </div>
      </div>
      <div className="rounded-md border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="h-8 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
