import { Suspense } from "react";
import { ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EnrollmentsTable } from "@/components/enrollments/enrollments-table";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import {
  loadEnrollmentsList,
  parseEnrollmentsSearchParams,
} from "@/lib/v2/loaders/enrollments";
import type { EnrollmentsQuery } from "@/lib/api/enrollments";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function EnrollmentsListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 max-w-xs" />
      <DataTableShell>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </DataTableShell>
    </div>
  );
}

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
  const { result } = await loadEnrollmentsList(query);

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

export default async function V2EnrollmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminUser();
  const t = await getTranslations("enrollments");
  const rawParams = await searchParams;
  const query = parseEnrollmentsSearchParams(rawParams);

  const messages: EnrollmentsMessages = {
    errorEmptyTitle: t("page.errorEmptyTitle"),
    emptyTitle: t("page.emptyTitle"),
    emptyDescription: t("page.emptyDescription"),
    countSingular: t("page.countSingular"),
    countPlural: t("page.countPlural"),
  };

  return (
    <V2PageShell title={t("page.title")} description={t("page.description")} bleed>
      <Suspense fallback={<EnrollmentsListSkeleton />}>
        <div className="space-y-4">
          <EnrollmentsFilters
            defaultSearch={query.search}
            searchPlaceholder={t("page.searchPlaceholder")}
          />
          <EnrollmentsContent query={query} messages={messages} />
        </div>
      </Suspense>
    </V2PageShell>
  );
}
