import { DataTableShell } from "@/components/shared/data-table-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvestitureRequestDetailLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-3 w-64 max-w-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
      <DataTableShell>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28 md:hidden" />
            </div>
            <Skeleton className="hidden h-4 w-28 md:block" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="hidden h-8 w-56 sm:block" />
          </div>
        ))}
      </DataTableShell>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-52" />
      </div>
    </div>
  );
}
