"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Eye, FileText } from "lucide-react";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { ListFilterField } from "@/components/shared/list-filters-shell";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { ClubSelect } from "@/components/shared/selectors/club-select";
import { EcclesiasticalYearSelect } from "@/components/shared/selectors/ecclesiastical-year-select";
import { PeriodicReportStatusBadge } from "@/components/periodic-reports/report-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PERIODIC_REPORT_STATUSES,
  ecclesiasticalYearLabel,
  formatReportFinalizerName,
  triggerAnnualReportPdfDownload,
  type AdminAnnualReport,
  type PeriodicReportsPage,
} from "@/lib/api/reports";
import type { ErrorStateFromError } from "@/lib/api/error-state";
import { useFormatDateTime } from "@/lib/format-locale";
import { reportsTabHref } from "@/lib/reports/tabs";

const TAB = "annual";
const DETAIL_PATH = "/dashboard/reports/annual";
const ALL = "all";

export type AnnualReportsSearchParams = {
  club_id?: string;
  ecclesiastical_year_id?: string;
  status?: string;
  page?: string;
  limit?: string;
};

interface AnnualReportsListClientProps {
  /** `null` when the list failed to load: the table shows the error, never an empty list. */
  data: PeriodicReportsPage<AdminAnnualReport> | null;
  error?: ErrorStateFromError | null;
  searchParams: AnnualReportsSearchParams;
  /** reports:download */
  canDownload: boolean;
}

export function AnnualReportsListClient({
  data,
  error = null,
  searchParams,
  canDownload,
}: AnnualReportsListClientProps) {
  const t = useTranslations("periodicReports");
  const tn = useTranslations("evaluation.reports");
  const router = useRouter();
  const formatDateTime = useFormatDateTime();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasFilters = Boolean(
    searchParams.club_id || searchParams.ecclesiastical_year_id || searchParams.status,
  );

  function applyFilter(key: keyof AnnualReportsSearchParams, value: string | undefined) {
    const next: AnnualReportsSearchParams = { ...searchParams, [key]: value };
    delete next.page;
    const query = new URLSearchParams();
    for (const [name, val] of Object.entries(next)) {
      if (val) query.set(name, val);
    }
    router.push(reportsTabHref(TAB, Object.fromEntries(query)));
  }

  async function handleDownload(report: AdminAnnualReport) {
    setDownloadingId(report.annual_report_id);
    try {
      await triggerAnnualReportPdfDownload(report.annual_report_id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.errors.download"));
    } finally {
      setDownloadingId(null);
    }
  }

  const actionsFor = (report: AdminAnnualReport, detailHref: string) => [
    { label: t("common.actions.view"), icon: Eye, href: detailHref },
    {
      label: t("common.actions.downloadPdf"),
      icon: Download,
      onSelect: () => void handleDownload(report),
      disabled: downloadingId === report.annual_report_id,
      hidden: !canDownload,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <ListFilterField id="annual-filter-club" label={t("common.filters.club")} className="w-[240px]">
          <ClubSelect
            value={searchParams.club_id ? Number(searchParams.club_id) : null}
            onChange={(clubId) => applyFilter("club_id", clubId == null ? undefined : String(clubId))}
            placeholder={t("common.filters.clubAll")}
          />
        </ListFilterField>

        <ListFilterField id="annual-filter-year" label={t("annual.filters.year")} className="w-[240px]">
          <EcclesiasticalYearSelect
            value={
              searchParams.ecclesiastical_year_id
                ? Number(searchParams.ecclesiastical_year_id)
                : null
            }
            onChange={(yearId) =>
              applyFilter("ecclesiastical_year_id", yearId == null ? undefined : String(yearId))
            }
            placeholder={t("annual.filters.yearAll")}
            activeOnly={false}
          />
        </ListFilterField>

        <ListFilterField id="annual-filter-status" label={t("common.filters.status")} className="w-[180px]">
          <Select
            value={searchParams.status ?? ALL}
            onValueChange={(value) => applyFilter("status", value === ALL ? undefined : value)}
          >
            <SelectTrigger id="annual-filter-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("common.filters.statusAll")}</SelectItem>
              {PERIODIC_REPORT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`common.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ListFilterField>
      </div>

      {error ? (
        <DataTableShell>
          <Table>
            <TableHeader className="max-md:hidden">
              <TableRow>
                <TableHead>{t("common.columns.club")}</TableHead>
                <TableHead>{t("annual.columns.period")}</TableHead>
                <TableHead>{t("common.columns.status")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("common.columns.calculated")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("common.columns.finalized")}</TableHead>
                <RowActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              <ErrorStateTableRow colSpan={6} kind={error.kind} {...(error.detail ? { detail: error.detail } : {})} retry />
            </TableBody>
          </Table>
        </DataTableShell>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          variant={hasFilters ? "no-results" : "default"}
          title={hasFilters ? t("common.empty.filteredTitle") : t("annual.empty.title")}
          description={
            hasFilters ? t("common.empty.filteredDescription") : t("annual.empty.description")
          }
        />
      ) : (
        <>
          <DataTableShell className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.columns.club")}</TableHead>
                  <TableHead>{t("annual.columns.period")}</TableHead>
                  <TableHead>{t("common.columns.status")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("common.columns.calculated")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("common.columns.finalized")}</TableHead>
                  <RowActionsHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((report) => {
                  const detailHref = `${DETAIL_PATH}/${report.annual_report_id}`;
                  const clubName = report.club?.name ?? t("common.unknownClub");
                  const period = ecclesiasticalYearLabel(report.ecclesiastical_year) ?? "—";
                  const finalizer = formatReportFinalizerName(report.finalized_by_user);
                  return (
                    <TableRow key={report.annual_report_id}>
                      <TableCell className="font-medium">
                        <Link href={detailHref} className="hover:underline">
                          {clubName}
                        </Link>
                      </TableCell>
                      <TableCell>{period}</TableCell>
                      <TableCell>
                        <PeriodicReportStatusBadge status={report.status} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {report.auto_generated_at ? formatDateTime(report.auto_generated_at) : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {report.finalized_at ? (
                          <>
                            {formatDateTime(report.finalized_at)}
                            {finalizer ? (
                              <span className="block text-xs text-muted-foreground">{finalizer}</span>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <RowActions
                          label={`${clubName} · ${period}`}
                          actions={actionsFor(report, detailHref)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>

          <ul className="md:hidden" aria-label={tn("periodic.listLabel")}>
            {items.map((report) => {
              const detailHref = `${DETAIL_PATH}/${report.annual_report_id}`;
              const clubName = report.club?.name ?? t("common.unknownClub");
              const period = ecclesiasticalYearLabel(report.ecclesiastical_year) ?? "—";
              return (
                <li key={report.annual_report_id} className="flex items-start gap-2 border-b py-3 last:border-b-0">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={detailHref} className="truncate font-medium hover:underline">
                        {clubName}
                      </Link>
                      <PeriodicReportStatusBadge status={report.status} />
                    </div>
                    <p className="text-[13px] text-muted-foreground tabular-nums">{period}</p>
                  </div>
                  <RowActions label={`${clubName} · ${period}`} actions={actionsFor(report, detailHref)} />
                </li>
              );
            })}
          </ul>

          <DataTablePagination page={page} totalPages={totalPages} total={total} limit={limit} />
        </>
      )}
    </div>
  );
}
