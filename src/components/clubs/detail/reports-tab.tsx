"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DetailSection } from "@/components/users/detail/section";
import type { AnnualReport, QuarterlyReport } from "@/lib/api/reports";

interface ReportsTabProps {
  annualReports: AnnualReport[];
  quarterlyReports: QuarterlyReport[];
}

function formatYear(report: AnnualReport | QuarterlyReport) {
  return report.ecclesiastical_year_id ? String(report.ecclesiastical_year_id) : "—";
}

export function ReportsTab({ annualReports, quarterlyReports }: ReportsTabProps) {
  const t = useTranslations("clubs.detail.reports");

  return (
    <div className="space-y-3.5">
      <DetailSection num="01" title={t("annualTitle")}>
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
                    <TableCell>{formatYear(report)}</TableCell>
                    <TableCell>{report.status ?? "—"}</TableCell>
                    <TableCell>
                      {report.created_at
                        ? new Date(report.created_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DetailSection>

      <DetailSection num="02" title={t("quarterlyTitle")}>
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
                    <TableCell>{formatYear(report)}</TableCell>
                    <TableCell>{report.quarter ?? "—"}</TableCell>
                    <TableCell>{report.status ?? "—"}</TableCell>
                    <TableCell>
                      {report.created_at
                        ? new Date(report.created_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DetailSection>
    </div>
  );
}
