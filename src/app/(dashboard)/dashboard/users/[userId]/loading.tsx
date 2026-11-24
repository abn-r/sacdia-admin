import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the real detail: header, 300px aside, tab bar and two blocks. */
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <Skeleton className="h-4 w-56" />
      <div className="flex items-start gap-4">
        <Skeleton className="size-14 shrink-0 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-3 rounded-xl border bg-card p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
          <Skeleton className="mt-4 h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="min-w-0 space-y-6">
          <Skeleton className="h-9 w-full max-w-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
