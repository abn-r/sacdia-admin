"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState, ErrorStateTableRow } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormatDate } from "@/lib/format-locale";
import {
  ecclesiasticalYearLabel,
  type AnnualReport,
  type QuarterlyReport,
} from "@/lib/api/reports";

interface ReportsTabProps {
  annualReports: AnnualReport[];
  quarterlyReports: QuarterlyReport[];
  /** The list request failed: show an error instead of the empty message. */
  annualReportsError?: boolean;
  quarterlyReportsError?: boolean;
  /** reports:read: the row links to the report detail. */
  canOpenReports?: boolean;
}

type ReportRow = {
  key: string;
  kind: "annual" | "quarterly";
  /** Year, or "2025-2026" for annual reports spanning two calendar years. */
  year: string;
  quarter: number | null;
  status: string;
  createdAt: string | null;
  href: string;
};

function buildRows(annual: AnnualReport[], quarterly: QuarterlyReport[]): ReportRow[] {
  const rows: ReportRow[] = [
    ...annual.map((report) => ({
      key: `annual-${report.annual_report_id}`,
      kind: "annual" as const,
      year:
        ecclesiasticalYearLabel(report.ecclesiastical_year) ??
        String(report.ecclesiastical_year_id),
      quarter: null,
      status: report.status ?? "",
      createdAt: report.created_at ?? null,
      href: `/dashboard/reports/annual/${report.annual_report_id}`,
    })),
    ...quarterly.map((report) => ({
      key: `quarterly-${report.quarterly_report_id}`,
      kind: "quarterly" as const,
      year: report.year != null ? String(report.year) : "—",
      quarter: report.quarter ?? null,
      status: report.status ?? "",
      createdAt: report.created_at ?? null,
      href: `/dashboard/reports/quarterly/${report.quarterly_report_id}`,
    })),
  ];
  return rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export function ReportsTab({
  annualReports,
  quarterlyReports,
  annualReportsError = false,
  quarterlyReportsError = false,
  canOpenReports = false,
}: ReportsTabProps) {
  const t = useTranslations("people.clubDetail.reports");
  const tOld = useTranslations("clubs.detail.reports");
  const tStatus = useTranslations("periodicReports.common.status");
  const formatDate = useFormatDate();

  const rows = buildRows(annualReports, quarterlyReports);
  const bothFailed = annualReportsError && quarterlyReportsError;
  const oneFailed = annualReportsError !== quarterlyReportsError;

  function nameOf(row: ReportRow) {
    return row.kind === "annual"
      ? t("annualName", { year: row.year })
      : t("quarterlyName", { quarter: row.quarter ?? "—", year: row.year });
  }

  function statusOf(status: string) {
    if (status === "draft") return <StatusBadge intent="info" label={tStatus("draft")} />;
    if (status === "finalized") {
      return <span className="text-muted-foreground">{tStatus("finalized")}</span>;
    }
    return <span className="text-muted-foreground">{status || "—"}</span>;
  }

  // Nothing to show and nothing failed: an empty state outside the table.
  if (rows.length === 0 && !annualReportsError && !quarterlyReportsError) {
    return <EmptyState icon={FileText} title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="space-y-3">
      {oneFailed ? (
        <ErrorState
          variant="inline"
          retry
          title={annualReportsError ? tOld("loadErrorAnnual") : tOld("loadErrorQuarterly")}
        />
      ) : null}
      {rows.length === 0 && oneFailed ? null : (
      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("report")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("created")}</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">{t("open")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bothFailed ? (
              <ErrorStateTableRow colSpan={4} retry title={t("loadError")} />
            ) : (
              rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">
                    {canOpenReports ? (
                      <Link href={row.href} className="hover:underline">
                        {nameOf(row)}
                      </Link>
                    ) : (
                      nameOf(row)
                    )}
                  </TableCell>
                  <TableCell>{statusOf(row.status)}</TableCell>
                  <TableCell className="tabular-nums">
                    {row.createdAt ? formatDate(row.createdAt) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {canOpenReports ? (
                      <Link href={row.href} aria-label={t("openReport", { name: nameOf(row) })}>
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableShell>
      )}
    </div>
  );
}
