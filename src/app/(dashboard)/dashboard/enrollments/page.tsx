import { Suspense } from "react";
import { ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EnrollmentsTable } from "@/components/enrollments/enrollments-table";
import { listEnrollments, type EnrollmentsQuery } from "@/lib/api/enrollments";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseSearchParams(raw: Record<string, string | string[] | undefined>): EnrollmentsQuery {
  const getString = (key: string) => {
    const v = raw[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  };
  const getNumber = (key: string) => {
    const v = getString(key);
    return v ? Number(v) : undefined;
  };

  return {
    search: getString("search"),
    ecclesiastical_year_id: getNumber("year"),
    page: getNumber("page") ?? 1,
    limit: getNumber("limit") ?? 20,
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function EnrollmentsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-xs" />
      </div>
      <DataTableShell>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b p-4 last:border-b-0"
          >
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </DataTableShell>
    </div>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

type EnrollmentsMessages = {
  errorEmptyTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  countSingular: string;
  countPlural: string;
};

async function EnrollmentsContent({
  query,
  messages,
}: {
  query: EnrollmentsQuery;
  messages: EnrollmentsMessages;
}) {
  const result = await listEnrollments(query);

  if (!result.endpointAvailable) {
    return (
      <div className="space-y-4">
        <EndpointErrorBanner
          state={result.endpointState as "forbidden" | "missing" | "rate-limited"}
          detail={result.endpointDetail}
          showLoginLink={result.endpointState === "forbidden"}
        />
        <EmptyState
          icon={ClipboardList}
          title={messages.errorEmptyTitle}
          description={result.endpointDetail}
        />
      </div>
    );
  }

  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={messages.emptyTitle}
        description={messages.emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{result.items.length}</span>{" "}
        {result.items.length === 1 ? messages.countSingular : messages.countPlural}
      </p>

      <EnrollmentsTable enrollments={result.items} />
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function EnrollmentsFilters({
  defaultSearch,
  searchPlaceholder,
}: {
  defaultSearch?: string;
  searchPlaceholder: string;
}) {
  return (
    <form className="flex flex-wrap gap-3" method="GET">
      <Input
        name="search"
        placeholder={searchPlaceholder}
        defaultValue={defaultSearch}
        className="h-9 max-w-xs"
      />
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminUser();
  const t = await getTranslations("enrollments");
  const rawParams = await searchParams;
  const query = parseSearchParams(rawParams);

  const messages: EnrollmentsMessages = {
    errorEmptyTitle: t("page.errorEmptyTitle"),
    emptyTitle: t("page.emptyTitle"),
    emptyDescription: t("page.emptyDescription"),
    countSingular: t("page.countSingular"),
    countPlural: t("page.countPlural"),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      <Suspense fallback={<EnrollmentsListSkeleton />}>
        <div className="space-y-4">
          <EnrollmentsFilters
            defaultSearch={query.search}
            searchPlaceholder={t("page.searchPlaceholder")}
          />
          <EnrollmentsContent query={query} messages={messages} />
        </div>
      </Suspense>
    </div>
  );
}
