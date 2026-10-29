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
import { ListFilterField, ListFiltersShell } from "@/components/shared/list-filters-shell";
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
import { useFormatDateTime } from "@/lib/format-locale";

const LIST_PATH = "/dashboard/reports/annual";
const ALL = "all";

export type AnnualReportsSearchParams = {
  club_id?: string;
  ecclesiastical_year_id?: string;
  status?: string;
  page?: string;
  limit?: string;
};

interface AnnualReportsListClientProps {
  data: PeriodicReportsPage<AdminAnnualReport>;
  searchParams: AnnualReportsSearchParams;
  /** reports:download */
  canDownload: boolean;
}

export function AnnualReportsListClient({
  data,
  searchParams,
  canDownload,
}: AnnualReportsListClientProps) {
  const t = useTranslations("periodicReports");
  const router = useRouter();
  const formatDateTime = useFormatDateTime();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const { items, total, page, limit } = data;
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
    const qs = query.toString();
    router.push(qs ? `${LIST_PATH}?${qs}` : LIST_PATH);
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

  return (
    <div className="space-y-4">
      <ListFiltersShell title={t("common.filters.title")}>
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
      </ListFiltersShell>

      {items.length === 0 ? (
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
          <DataTableShell>
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
                  const detailHref = `${LIST_PATH}/${report.annual_report_id}`;
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
                          actions={[
                            { label: t("common.actions.view"), icon: Eye, href: detailHref },
                            {
                              label: t("common.actions.downloadPdf"),
                              icon: Download,
                              onSelect: () => void handleDownload(report),
                              disabled: downloadingId === report.annual_report_id,
                              hidden: !canDownload,
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>

          <DataTablePagination page={page} totalPages={totalPages} total={total} limit={limit} />
        </>
      )}
    </div>
  );
}
