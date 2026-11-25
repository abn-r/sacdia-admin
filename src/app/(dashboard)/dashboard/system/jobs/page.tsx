import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";
import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import { requireAdminUser } from "@/lib/auth/session";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { UrlTabs } from "@/components/shared/url-tabs";
import {
  getCronRuns,
  getCronRunsHistory,
  getJobsOverview,
  listCronJobs,
} from "@/lib/api/analytics";
import {
  buildSystemHref,
  parseCronHistoryFilters,
  parseSystemTab,
  SYSTEM_JOBS_PATH,
} from "@/lib/system/system-view";
import { CronHistoryTab } from "./_components/cron-history-tab";
import { CronRunsSection } from "./_components/cron-runs-section";
import { QueuesTab } from "./_components/queues-tab";
import { SystemRefreshButton } from "./_components/system-refresh-button";

export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.system");
  return { title: t("title") };
}

function LoadError({ error }: { error: unknown }) {
  const { kind, detail } = errorStateFromError(error);
  return <ErrorState kind={kind} {...(detail ? { detail } : {})} retry />;
}

export default async function SystemJobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireAdminUser();
  // The layout hides a forbidden page, but it renders in parallel with it:
  // stop here so the page does not call the API for nothing.
  if (!canAccessDashboardPath(user, SYSTEM_JOBS_PATH)) {
    return <PageAccessForbidden />;
  }

  const t = await getTranslations("admin.system");
  const params = await searchParams;
  const tab = parseSystemTab(params.tab);
  const filters = parseCronHistoryFilters(params);

  // The failed count is the number on the first tab, so the overview loads on every tab.
  const overviewResult = await Promise.allSettled([getJobsOverview()]).then(([r]) => r);
  const failedCount =
    overviewResult.status === "fulfilled"
      ? overviewResult.value.queues.reduce((sum, q) => sum + q.failed, 0)
      : 0;

  let content: React.ReactNode;

  if (tab === "queues") {
    if (overviewResult.status === "fulfilled") {
      content = <QueuesTab data={overviewResult.value} />;
    } else {
      console.error("[SystemPage] Failed to load queues:", overviewResult.reason);
      content = <LoadError error={overviewResult.reason} />;
    }
  } else if (tab === "cron") {
    const [runsResult, catalogResult] = await Promise.allSettled([getCronRuns(), listCronJobs()]);
    // The catalog is 403 for non super-admins: expected, not worth an error log.
    if (
      catalogResult.status === "rejected" &&
      !(catalogResult.reason instanceof ApiError && catalogResult.reason.status === 403)
    ) {
      console.error("[SystemPage] Failed to load cron catalog:", catalogResult.reason);
    }
    if (runsResult.status === "fulfilled") {
      content = (
        <CronRunsSection
          data={runsResult.value}
          catalog={catalogResult.status === "fulfilled" ? catalogResult.value : undefined}
        />
      );
    } else {
      console.error("[SystemPage] Failed to load cron runs:", runsResult.reason);
      content = <LoadError error={runsResult.reason} />;
    }
  } else {
    const [historyResult] = await Promise.allSettled([
      getCronRunsHistory({
        job_name: filters.job_name,
        status: filters.status,
        since: filters.since,
        until: filters.until,
        page: filters.page,
        limit: 20,
      }),
    ]);
    if (historyResult.status === "fulfilled") {
      content = <CronHistoryTab data={historyResult.value} filters={filters} />;
    } else {
      console.error("[SystemPage] Failed to load cron history:", historyResult.reason);
      content = <LoadError error={historyResult.reason} />;
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<SystemRefreshButton />}
      />
      <UrlTabs
        ariaLabel={t("title")}
        defaultValue="queues"
        tabs={[
          {
            value: "queues",
            label: t("tabs.queues"),
            href: buildSystemHref("queues"),
            ...(failedCount > 0 ? { count: failedCount } : {}),
          },
          { value: "cron", label: t("tabs.cron"), href: buildSystemHref("cron") },
          { value: "history", label: t("tabs.history"), href: buildSystemHref("history") },
        ]}
      />
      {content}
    </div>
  );
}
