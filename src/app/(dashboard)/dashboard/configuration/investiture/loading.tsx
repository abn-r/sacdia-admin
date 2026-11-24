import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-4 border-b py-6 first:pt-0 last:border-b-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
      <div className="space-y-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-60 max-w-full" />
      </div>
      <div className="divide-y rounded-xl border bg-card">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-6 px-5 py-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InvestitureSettingsLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-56" />
      </div>
      <div>
        <SectionSkeleton rows={3} />
        <SectionSkeleton rows={4} />
      </div>
    </div>
  );
}
