"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PeriodicReportStatusBadge } from "@/components/periodic-reports/report-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DetailSection } from "@/components/users/detail/section";
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
  /** reports:read — the first cell links to the report detail. */
  canOpenReports?: boolean;
}

function ReportLink({
  href,
  enabled,
  children,
}: {
  href: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <Link href={href} className="font-medium hover:underline">
      {children}
    </Link>
  );
}

export function ReportsTab({
  annualReports,
  quarterlyReports,
  annualReportsError = false,
  quarterlyReportsError = false,
  canOpenReports = false,
}: ReportsTabProps) {
  const t = useTranslations("clubs.detail.reports");
  const formatDate = useFormatDate();

  const created = (value?: string | null) => (value ? formatDate(value) : "—");

  return (
    <div className="space-y-3.5">
      <DetailSection num="01" title={t("annualTitle")}>
        {annualReportsError ? (
          <Alert variant="destructive">
            <AlertDescription>{t("loadErrorAnnual")}</AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/70">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>{t("yearLabel")}</TableHead>
                  <TableHead>{t("statusLabel")}</TableHead>
                  <TableHead>{t("createdLabel")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {annualReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      {t("emptyAnnual")}
                    </TableCell>
                  </TableRow>
                ) : (
                  annualReports.map((report) => (
                    <TableRow key={report.annual_report_id}>
                      <TableCell>
                        <ReportLink
                          href={`/dashboard/reports/annual/${report.annual_report_id}`}
                          enabled={canOpenReports}
                        >
                          {ecclesiasticalYearLabel(report.ecclesiastical_year) ??
                            String(report.ecclesiastical_year_id)}
                        </ReportLink>
                      </TableCell>
                      <TableCell>
                        <PeriodicReportStatusBadge status={report.status ?? ""} />
                      </TableCell>
                      <TableCell>{created(report.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DetailSection>

      <DetailSection num="02" title={t("quarterlyTitle")}>
        {quarterlyReportsError ? (
          <Alert variant="destructive">
            <AlertDescription>{t("loadErrorQuarterly")}</AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/70">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>{t("yearLabel")}</TableHead>
                  <TableHead>{t("quarterLabel")}</TableHead>
                  <TableHead>{t("statusLabel")}</TableHead>
                  <TableHead>{t("createdLabel")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quarterlyReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      {t("emptyQuarterly")}
                    </TableCell>
                  </TableRow>
                ) : (
                  quarterlyReports.map((report) => (
                    <TableRow key={report.quarterly_report_id}>
                      <TableCell>
                        <ReportLink
                          href={`/dashboard/reports/quarterly/${report.quarterly_report_id}`}
                          enabled={canOpenReports}
                        >
                          {report.year ?? "—"}
                        </ReportLink>
                      </TableCell>
                      <TableCell>{report.quarter ?? "—"}</TableCell>
                      <TableCell>
                        <PeriodicReportStatusBadge status={report.status ?? ""} />
                      </TableCell>
                      <TableCell>{created(report.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DetailSection>
    </div>
  );
}
