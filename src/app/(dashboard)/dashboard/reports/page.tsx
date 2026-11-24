import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { UrlTabs, type UrlTabItem } from "@/components/shared/url-tabs";
import { AnnualReportsListClient } from "@/components/periodic-reports/annual-reports-list-client";
import { GenerateAnnualReportButton } from "@/components/periodic-reports/generate-annual-report-dialog";
import { GenerateQuarterlyReportButton } from "@/components/periodic-reports/generate-quarterly-report-dialog";
import { QuarterlyReportsListClient } from "@/components/periodic-reports/quarterly-reports-list-client";
import { MonthlyClubList } from "@/components/reports/monthly-club-list";
import { MonthlyTerritoryList } from "@/components/reports/monthly-territory-list";
import { NewMonthlyReportButton } from "@/components/reports/new-monthly-report-button";
import { Button } from "@/components/ui/button";
import { resolveActiveClubContext } from "@/lib/auth/club-context";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { readAuthorizationTerritory } from "@/lib/auth/territory-scope";
import { resolveReportsAudience } from "@/lib/reports/audience";
import { countPending, monthlyFinding, type PendingCounts } from "@/lib/reports/status";
import { parseReportsTab, reportsTabHref } from "@/lib/reports/tabs";
import { loadClubMonthly, loadTerritoryMonthly } from "./_data/monthly";
import { loadAnnual, loadQuarterly } from "./_data/periodic";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("evaluation.reports");
  return { title: t("page.title") };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireAdminUser();
  const t = await getTranslations("evaluation.reports");
  const query = await searchParams;
  const tab = parseReportsTab(query.tab);
  const now = new Date();
  const currentYear = now.getFullYear();

  const canQuarterly = canViewScreen(user, "reports-quarterly");
  const canAnnual = canViewScreen(user, "reports-annual");
  // The layout hides a forbidden page, but it renders in parallel with it:
  // stop here so the page does not call the API for nothing.
  if ((tab === "quarterly" && !canQuarterly) || (tab === "annual" && !canAnnual)) {
    return <PageAccessForbidden />;
  }

  const audience = resolveReportsAudience({
    territoryLevel: readAuthorizationTerritory(user).level,
    hasClubContext: resolveActiveClubContext(user) !== null,
    canSupervise: canViewScreen(user, "reports-supervision"),
  });

  let description = t(`page.description.${tab}`);
  let pending: PendingCounts | null = null;
  let actions: React.ReactNode = null;
  let content: React.ReactNode = null;

  if (tab === "monthly") {
    const printPreview = (
      <Button variant="outline" size="sm" asChild>
        <Link href="/reports/monthly-preview">
          <FileText aria-hidden="true" />
          {t("page.printPreview")}
        </Link>
      </Button>
    );

    if (audience === "territory") {
      const view = await loadTerritoryMonthly(user, query, currentYear, {
        division: t("territory.groupDivision"),
        union: t("territory.groupUnion"),
        localField: t("territory.groupLocalField"),
      });
      pending = view.counts;
      description = t("page.description.territory");
      actions = printPreview;
      content = (
        <MonthlyTerritoryList
          data={view.data}
          error={view.error}
          clubTypes={view.clubTypes}
          scopeOptions={view.scopeOptions}
          searchParams={view.searchParams}
          currentYear={currentYear}
        />
      );
    } else if (audience === "club") {
      const view = await loadClubMonthly(user, query, currentYear);
      if (view.kind === "ready") {
        pending = view.all ? countPending(view.all) : null;
        actions = (
          <>
            {printPreview}
            <NewMonthlyReportButton
              enrollmentId={view.enrollmentId}
              initialMonth={now.getMonth() + 1}
              initialYear={currentYear}
            />
          </>
        );
        content = (
          <MonthlyClubList
            reports={view.reports}
            error={view.error}
            searchParams={view.searchParams}
            currentYear={currentYear}
            clubLabel={view.clubLabel}
          />
        );
      } else if (view.error) {
        content = <ErrorState kind={view.error.kind} {...(view.error.detail ? { detail: view.error.detail } : {})} retry />;
      } else {
        content = (
          <EmptyState
            icon={FileText}
            title={t("page.noEnrollmentTitle")}
            description={t("page.noEnrollmentDescription")}
          />
        );
      }
    } else {
      content = (
        <EmptyState icon={FileText} title={t("page.noScopeTitle")} description={t("page.noScopeDescription")} />
      );
    }

    if (pending) {
      const finding = monthlyFinding(pending);
      description =
        finding.kind === "clear"
          ? t("finding.clear")
          : finding.kind === "toSend"
            ? t("finding.toSend", { count: finding.toSend })
            : finding.kind === "drafts"
              ? t("finding.drafts", { count: finding.drafts })
              : t("finding.both", { toSend: finding.toSend, drafts: finding.drafts });
    }
  } else if (tab === "quarterly") {
    const view = await loadQuarterly(query);
    actions = canCapability(user, "reports-quarterly", "generate") ? <GenerateQuarterlyReportButton /> : null;
    content = (
      <QuarterlyReportsListClient
        data={view.data}
        error={view.error}
        searchParams={view.searchParams}
        canDownload={canCapability(user, "reports-quarterly", "download")}
      />
    );
  } else {
    const view = await loadAnnual(query);
    actions = canCapability(user, "reports-annual", "generate") ? <GenerateAnnualReportButton /> : null;
    content = (
      <AnnualReportsListClient
        data={view.data}
        error={view.error}
        searchParams={view.searchParams}
        canDownload={canCapability(user, "reports-annual", "download")}
      />
    );
  }

  const pendingTotal = pending ? pending.drafts + pending.toSend : 0;
  const tabs: UrlTabItem[] = [
    {
      value: "monthly",
      label: t("tabs.monthly"),
      href: reportsTabHref("monthly"),
      ...(pendingTotal > 0 ? { count: pendingTotal } : {}),
    },
    ...(canQuarterly
      ? [{ value: "quarterly", label: t("tabs.quarterly"), href: reportsTabHref("quarterly") }]
      : []),
    ...(canAnnual ? [{ value: "annual", label: t("tabs.annual"), href: reportsTabHref("annual") }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={description}>
        {actions}
      </PageHeader>

      {tabs.length > 1 && <UrlTabs ariaLabel={t("tabs.label")} tabs={tabs} defaultValue="monthly" />}

      {content}
    </div>
  );
}
