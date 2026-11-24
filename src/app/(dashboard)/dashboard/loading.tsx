import { getTranslations } from "next-intl/server";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the operations home: title row with its action, period line, the KPI strip,
 * the work queue beside the breakdown table, and the class chart. Flat bars only.
 */
export default async function DashboardLoading() {
  const t = await getTranslations("shared");

  return (
    <div className="@container/main flex flex-col gap-6" aria-busy="true">
      <span className="sr-only" role="status">
        {t("pageSkeleton.loading")}
      </span>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-xl bg-card shadow-card sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2 border-border p-4 sm:border-l sm:first:border-l-0">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-3">
        <div className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <div className="overflow-hidden rounded-xl bg-card shadow-card">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex h-12 items-center gap-3 border-b px-4 last:border-b-0">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <DataTableShell>
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex h-12 items-center gap-4 border-b px-4 last:border-b-0">
                <Skeleton className="h-4 w-1/3 min-w-24" />
                <Skeleton className="ml-auto h-1 w-16" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-1 w-16" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </DataTableShell>
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-44" />
        <div className="space-y-2 rounded-xl bg-card p-4 shadow-card">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3rem] items-center gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2" />
              <Skeleton className="h-4 w-8 justify-self-end" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
