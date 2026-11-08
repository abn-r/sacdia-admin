import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableShell } from "@/components/shared/data-table-shell";

interface ListPageSkeletonProps {
  /** Number of table rows (~48px each). @default 8 */
  rows?: number;
  /** Number of filter controls (36px high). @default 3 */
  filters?: number;
}

/**
 * Loading placeholder that mirrors a list page: PageHeader, filter row and a
 * table frame. Flat bg-muted bars; Skeleton already honours reduced motion.
 */
export async function ListPageSkeleton({ rows = 8, filters = 3 }: ListPageSkeletonProps) {
  const t = await getTranslations("shared");

  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">
        {t("pageSkeleton.loading")}
      </span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: filters }, (_, i) => (
          <Skeleton key={i} className={i === 0 ? "h-9 min-w-0 flex-1 basis-56" : "h-9 w-36"} />
        ))}
      </div>
      <DataTableShell>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex h-12 items-center gap-4 border-b px-4 last:border-b-0">
            <Skeleton className="h-4 w-1/3 min-w-24" />
            <Skeleton className="hidden h-4 w-1/5 md:block" />
            <Skeleton className="ml-auto h-5 w-16" />
          </div>
        ))}
      </DataTableShell>
    </div>
  );
}

/** Loading placeholder for a detail page: header, summary card and a content block. */
export async function DetailPageSkeleton() {
  const t = await getTranslations("shared");

  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">
        {t("pageSkeleton.loading")}
      </span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
