import { Skeleton } from "@/components/ui/skeleton";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";

export default function ClubsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <DataTableShell>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`flex items-center gap-4 border-b p-4 last:border-b-0 ${STAGGER_CLASSES}`} style={getStaggerStyle(i, 50)}>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="ml-auto h-8 w-12" />
          </div>
        ))}
      </DataTableShell>
    </div>
  );
}
