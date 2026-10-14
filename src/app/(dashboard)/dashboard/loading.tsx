import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="@container/main flex flex-col gap-6">
      <div className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
