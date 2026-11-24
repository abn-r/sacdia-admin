"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiStrip, KpiStripItem } from "@/components/shared/kpi-strip";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import { CertificateBatchProgress } from "@/components/certificate-bulk-imports/certificate-batch-progress";
import {
  BATCH_TABS,
  getBatchProgress,
  matchesBatchTab,
  type BatchTab,
} from "@/components/certificate-bulk-imports/certificate-batch-model";
import { formatShortId, formatUserName, getBatchCounts } from "@/components/certificate-bulk-imports/helpers";
import { useFormatDate } from "@/lib/format-locale";
import type { CertificateBulkImportBatch } from "@/lib/api/certificate-bulk-imports";

interface CertificateBatchQueueProps {
  batches: CertificateBulkImportBatch[];
  /** Total reported by the API; may be larger than what was loaded. */
  total: number;
  detailBasePath?: string;
}

const DEFAULT_TAB: BatchTab = "pending";

function isBatchTab(value: string): value is BatchTab {
  return (BATCH_TABS as readonly string[]).includes(value);
}

/**
 * Queue A for "Cargas por certificado": one KpiStrip, the state of the batch
 * told by the tab, and a table with single-colour progress ("2 de 3").
 */
export function CertificateBatchQueue({
  batches,
  total,
  detailBasePath = "/dashboard/certificate-bulk-imports",
}: CertificateBatchQueueProps) {
  const t = useTranslations("queues.certificates.batches");
  const tList = useTranslations("certificate_bulk_imports.list");
  const formatDate = useFormatDate();
  const rawTab = useUrlTab("tab", DEFAULT_TAB);
  const tab: BatchTab = isBatchTab(rawTab) ? rawTab : DEFAULT_TAB;
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const pending = batches.filter((b) => matchesBatchTab(b, "pending"));
    const partial = batches.filter((b) => matchesBatchTab(b, "partial"));
    const correction = batches.filter((b) => matchesBatchTab(b, "correction"));
    const rowsToDecide = batches.reduce((sum, b) => {
      const c = getBatchCounts(b);
      return sum + c.pending + c.needsReview;
    }, 0);
    const oldest = pending
      .map((b) => b.submitted_at)
      .filter((value): value is string => Boolean(value))
      .sort()[0];
    return {
      pending: pending.length,
      partial: partial.length,
      correction: correction.length,
      all: batches.length,
      rowsToDecide,
      batchesWithRows: batches.filter((b) => {
        const c = getBatchCounts(b);
        return c.pending + c.needsReview > 0;
      }).length,
      oldest,
    };
  }, [batches]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return batches.filter((batch) => {
      if (!matchesBatchTab(batch, tab)) return false;
      if (!normalized) return true;
      return [formatUserName(batch.user), batch.batch_id, batch.user?.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [batches, tab, query]);

  const isFiltered = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <KpiStrip aria-label={t("kpiLabel")}>
        <KpiStripItem
          label={t("kpiBatches")}
          value={counts.pending}
          emphasis
          subline={counts.oldest ? t("kpiBatchesOldest", { date: formatDate(counts.oldest) }) : undefined}
        />
        <KpiStripItem
          label={t("kpiRows")}
          value={counts.rowsToDecide}
          subline={t("kpiRowsHint", { count: counts.batchesWithRows })}
        />
        <KpiStripItem label={t("kpiPartial")} value={counts.partial} subline={t("kpiPartialHint")} />
        <KpiStripItem label={t("kpiCorrection")} value={counts.correction} subline={t("kpiCorrectionHint")} />
      </KpiStrip>

      <UrlTabs
        ariaLabel={t("tabsLabel")}
        defaultValue={DEFAULT_TAB}
        tabs={BATCH_TABS.map((value) => ({ value, label: t(`tabs.${value}`), count: counts[value] }))}
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex w-full flex-col gap-1.5 sm:w-72">
          <Label htmlFor="certificate-batch-search" className="text-muted-foreground text-xs">
            {t("searchLabel")}
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="certificate-batch-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tList("searchPlaceholder")}
              className="pl-8"
            />
          </div>
        </div>
        {total > batches.length ? (
          <p className="pb-2 text-muted-foreground text-xs">{t("partialLoad", { loaded: batches.length, total })}</p>
        ) : null}
      </div>

      {visible.length === 0 ? (
        isFiltered ? (
          <EmptyState icon={Search} variant="no-results" title={tList("noResultsTitle")} description={tList("noResultsDescription")}>
            <Button type="button" variant="outline" size="sm" onClick={() => setQuery("")}>
              {t("clearSearch")}
            </Button>
          </EmptyState>
        ) : (
          <EmptyState icon={FileText} title={t(`empty.${tab}.title`)} description={t(`empty.${tab}.description`)} />
        )
      ) : (
        <>
          <DataTableShell className="max-md:hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tList("colBatch")}</TableHead>
                  <TableHead>{tList("colMember")}</TableHead>
                  <TableHead>{tList("colSubmitted")}</TableHead>
                  <TableHead>{tList("colProgress")}</TableHead>
                  <RowActionsHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((batch) => {
                  const progress = getBatchProgress(batch);
                  const name = formatUserName(batch.user);
                  return (
                    <TableRow key={batch.batch_id}>
                      <TableCell className="font-mono text-xs">{formatShortId(batch.batch_id)}</TableCell>
                      <TableCell>
                        <Link
                          href={`${detailBasePath}/${batch.batch_id}`}
                          prefetch={false}
                          className="font-medium hover:underline"
                        >
                          {name}
                        </Link>
                        <div className="text-muted-foreground text-xs">{batch.user?.email ?? tList("noEmail")}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm tabular-nums">
                        {batch.submitted_at ? formatDate(batch.submitted_at) : "—"}
                      </TableCell>
                      <TableCell>
                        <CertificateBatchProgress done={progress.done} total={progress.total} />
                      </TableCell>
                      <TableCell>
                        <RowActions
                          label={name}
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
          </DataTableShell>

          <ul className="overflow-hidden rounded-xl bg-card shadow-card md:hidden">
            {visible.map((batch) => {
              const progress = getBatchProgress(batch);
              return (
                <li key={batch.batch_id} className="border-b py-3 pr-3 pl-4 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`${detailBasePath}/${batch.batch_id}`}
                      prefetch={false}
                      className="min-w-0 truncate font-medium text-sm hover:underline"
                    >
                      {formatUserName(batch.user)}
                    </Link>
                    <span className="shrink-0 font-mono text-muted-foreground text-xs">
                      {formatShortId(batch.batch_id)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground tabular-nums">
                    <span>{batch.submitted_at ? formatDate(batch.submitted_at) : "—"}</span>
                    <CertificateBatchProgress done={progress.done} total={progress.total} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
