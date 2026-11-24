import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the club detail: header with key facts, tab bar, club data and a row per section. */
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="space-y-5">
      <Skeleton className="h-4 w-40" />
      <div className="flex items-start gap-4">
        <Skeleton className="size-14 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="flex gap-2 border-b pb-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-7 w-24" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="space-y-px overflow-hidden rounded-xl">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-none" />
        ))}
      </div>
    </div>
  );
}
