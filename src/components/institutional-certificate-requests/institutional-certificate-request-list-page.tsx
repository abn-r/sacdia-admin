"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, GraduationCap, Info, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import { useFormatDate } from "@/lib/format-locale";
import type {
  InstitutionalCertificateRequest,
  InstitutionalCertificateRequestStatus,
} from "@/lib/api/institutional-certificate-requests";

type Tab = "pending" | "approved" | "rejected" | "all";

const TABS: readonly Tab[] = ["pending", "approved", "rejected", "all"];
const TAB_STATUS: Record<Exclude<Tab, "all">, InstitutionalCertificateRequestStatus> = {
  pending: "PENDING_REVIEW",
  approved: "APPROVED",
  rejected: "REJECTED",
};

interface InstitutionalCertificateRequestListPageProps {
  requests: InstitutionalCertificateRequest[];
  /** Total reported by the API; may be larger than what was loaded. */
  total: number;
  detailBasePath?: string;
}

/** Queue A: the tab says the state, so there are no KPIs or filter buttons repeating it. */
export function InstitutionalCertificateRequestListPage({
  requests,
  total,
  detailBasePath = "/dashboard/institutional-certificate-requests",
}: InstitutionalCertificateRequestListPageProps) {
  const t = useTranslations("institutional_certificate_requests.page");
  const tLabels = useTranslations("institutional_certificate_requests.labels");
  const tStatus = useTranslations("institutional_certificate_requests.status");
  const tGm = useTranslations("queues.certificates.gm");
  const formatDateValue = useFormatDate();
  const rawTab = useUrlTab("tab", "pending");
  const tab: Tab = (TABS as readonly string[]).includes(rawTab) ? (rawTab as Tab) : "pending";
  const [query, setQuery] = useState("");

  const counts = useMemo<Record<Tab, number>>(
    () => ({
      pending: requests.filter((r) => r.status === "PENDING_REVIEW").length,
      approved: requests.filter((r) => r.status === "APPROVED").length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
      all: requests.length,
    }),
    [requests],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return requests.filter((req) => {
      if (tab !== "all" && req.status !== TAB_STATUS[tab]) return false;
      if (!normalized) return true;
      return [req.applicant_name, req.class_name, req.asset_code, req.request_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(normalized));
    });
  }, [requests, query, tab]);

  const isFiltered = query.trim().length > 0;

  const blockerMark = (req: InstitutionalCertificateRequest) =>
    req.approval_blockers?.length > 0 ? (
      <StatusBadge intent="info" size="sm" label={t("blockersCount", { count: req.approval_blockers.length })} />
    ) : null;

  const statusMark = (req: InstitutionalCertificateRequest) => (
    <ExceptionStatus
      value={req.status}
      normal={["PENDING_REVIEW"]}
      labels={{ PENDING_REVIEW: tStatus("PENDING_REVIEW"), APPROVED: tStatus("APPROVED"), REJECTED: tStatus("REJECTED") }}
      intents={{ APPROVED: "success", REJECTED: "neutral" }}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <UrlTabs
        ariaLabel={tGm("tabsLabel")}
        defaultValue="pending"
        tabs={TABS.map((value) => ({ value, label: tGm(`tabs.${value}`), count: counts[value] }))}
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex w-full flex-col gap-1.5 sm:w-72">
          <Label htmlFor="gm-search" className="text-muted-foreground text-xs">
            {tGm("searchLabel")}
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="gm-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-8"
            />
          </div>
        </div>
        {total > requests.length ? (
          <p className="pb-2 text-muted-foreground text-xs">{tGm("partialLoad", { loaded: requests.length, total })}</p>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        isFiltered ? (
          <EmptyState icon={Search} variant="no-results" title={t("noResultsTitle")} description={t("noResultsDescription")}>
            <Button type="button" variant="outline" size="sm" onClick={() => setQuery("")}>
              {tGm("clearSearch")}
            </Button>
          </EmptyState>
        ) : (
          <EmptyState icon={GraduationCap} title={tGm(`empty.${tab}.title`)} description={tGm(`empty.${tab}.description`)} />
        )
      ) : (
        <>
          <DataTableShell className="max-md:hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tLabels("applicant")}</TableHead>
                  <TableHead>{tLabels("class")}</TableHead>
                  <TableHead>{tLabels("certificateDate")}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t("colStatus")}</span>
                  </TableHead>
                  <RowActionsHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((req) => (
                  <TableRow key={req.request_id}>
                    <TableCell>
                      <Link
                        href={`${detailBasePath}/${req.request_id}`}
                        prefetch={false}
                        className="font-medium hover:underline"
                      >
                        {req.applicant_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>{req.class_name}</div>
                      <div className="font-mono text-muted-foreground text-xs">{req.asset_code}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm tabular-nums">
                      {req.completed_at ? formatDateValue(req.completed_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {statusMark(req)}
                        {blockerMark(req)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <RowActions
                        label={req.applicant_name}
                        actions={[]}
                        primary={
                          <Button size="sm" asChild>
                            <Link href={`${detailBasePath}/${req.request_id}`} prefetch={false}>
                              {t("review")}
                              <ArrowRight aria-hidden="true" />
                            </Link>
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>

          <ul className="overflow-hidden rounded-xl bg-card shadow-card md:hidden">
            {filtered.map((req) => (
              <li key={req.request_id} className="border-b py-3 pr-3 pl-4 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`${detailBasePath}/${req.request_id}`}
                    prefetch={false}
                    className="min-w-0 truncate font-medium text-sm hover:underline"
                  >
                    {req.applicant_name}
                  </Link>
                  <div className="flex shrink-0 gap-1.5">
                    {statusMark(req)}
                    {blockerMark(req)}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                  <span>
                    {req.class_name} · {req.asset_code}
                  </span>
                  <span>{req.completed_at ? formatDateValue(req.completed_at) : "—"}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Info className="size-3.5" aria-hidden="true" />
            {tGm("approvalNote")}
          </p>
        </>
      )}
    </div>
  );
}
