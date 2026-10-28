"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { CertificateBatchStatusBadge } from "@/components/certificate-bulk-imports/certificate-bulk-import-badges";
import { CertificateBulkImportProgress } from "@/components/certificate-bulk-imports/certificate-bulk-import-progress";
import {
  formatDateTime,
  formatShortId,
  formatUserName,
  getBatchCounts,
} from "@/components/certificate-bulk-imports/helpers";
import type { CertificateBulkImportBatch } from "@/lib/api/certificate-bulk-imports";

interface CertificateBulkImportListPageProps {
  batches: CertificateBulkImportBatch[];
  total: number;
  detailBasePath?: string;
}

function KpiCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Card className="py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-2">
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function CertificateBulkImportListPage({
  batches,
  total,
  detailBasePath = "/dashboard/certificate-bulk-imports",
}: CertificateBulkImportListPageProps) {
  const t = useTranslations("certificate_bulk_imports.page");
  const tList = useTranslations("certificate_bulk_imports.list");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "SUBMITTED" | "PARTIALLY_APPROVED" | "NEEDS_CORRECTION">("all");

  const filteredBatches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return batches.filter((batch) => {
      const matchesStatus = status === "all" || batch.status === status;
      if (!matchesStatus) return false;
      if (!normalized) return true;
      return [formatUserName(batch.user), batch.batch_id, batch.user?.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [batches, query, status]);

  const pendingRows = batches.reduce((sum, batch) => sum + getBatchCounts(batch).pending, 0);
  const correctionBatches = batches.filter((batch) => batch.status === "NEEDS_CORRECTION").length;
  const submittedBatches = batches.filter((batch) => batch.status === "SUBMITTED").length;

  if (batches.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard
          label={tList("kpiPendingBatches")}
          value={submittedBatches}
          hint={tList("kpiPendingBatchesHint", { total })}
        />
        <KpiCard label={tList("kpiRowsToReview")} value={pendingRows} hint={tList("kpiRowsToReviewHint")} />
        <KpiCard label={tList("kpiWithCorrections")} value={correctionBatches} hint={tList("kpiWithCorrectionsHint")} />
        <KpiCard label={tList("kpiTotalLoaded")} value={total} hint={tList("kpiTotalLoadedHint")} />
      </div>

      <Card className="py-0">
        <CardHeader className="border-b px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <p className="text-sm text-muted-foreground">{tList("listDescription")}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={tList("searchPlaceholder")}
                  aria-label={tList("searchPlaceholder")}
                  className="pl-8 sm:w-64"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  ["all", tList("filterAll")],
                  ["SUBMITTED", tList("filterPending")],
                  ["PARTIALLY_APPROVED", tList("filterPartial")],
                  ["NEEDS_CORRECTION", tList("filterCorrection")],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={status === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatus(value as typeof status)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tList("colBatch")}</TableHead>
                  <TableHead>{tList("colMember")}</TableHead>
                  <TableHead>{tList("colSubmitted")}</TableHead>
                  <TableHead>{tList("colStatus")}</TableHead>
                  <TableHead>{tList("colProgress")}</TableHead>
                  <RowActionsHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => {
                  const counts = getBatchCounts(batch);
                  return (
                    <TableRow key={batch.batch_id}>
                      <TableCell className="font-mono text-xs">
                        <Badge variant="outline">{formatShortId(batch.batch_id)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatUserName(batch.user)}</div>
                        <div className="text-xs text-muted-foreground">{batch.user?.email ?? tList("noEmail")}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(batch.submitted_at)}
                      </TableCell>
                      <TableCell><CertificateBatchStatusBadge status={batch.status} /></TableCell>
                      <TableCell>
                        <CertificateBulkImportProgress
                          approved={counts.approved}
                          rejected={counts.rejected}
                          pending={counts.pending + counts.needsReview}
                          total={counts.total}
                        />
                      </TableCell>
                      <TableCell>
                        <RowActions
                          label={formatUserName(batch.user)}
                          actions={[]}
                          primary={
                            <Button size="sm" asChild>
                              <Link href={`${detailBasePath}/${batch.batch_id}`} prefetch={false}>
                                {tList("review")}
                                <ArrowRight aria-hidden="true" />
                              </Link>
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredBatches.length === 0 && (
            <div className="p-6">
              <EmptyState
                icon={Search}
                title={tList("noResultsTitle")}
                description={tList("noResultsDescription")}
                variant="no-results"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
