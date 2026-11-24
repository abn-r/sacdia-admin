"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Award, Search } from "lucide-react";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PendingValidation } from "@/lib/api/validation";
import { useFormatDate } from "@/lib/format-locale";
import { HonorApprovalSheet, validationMemberName } from "./honor-approval-sheet";
import type { Loaded } from "./loaded";
import { daysWaiting, isOverdue } from "./queue-age";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

type WaitState = "ok" | "overdue";

function WaitCell({ days }: { days: number | null }) {
  const t = useTranslations("queues.classes");
  if (days === null) return <span className="text-muted-foreground">—</span>;
  const state: WaitState = isOverdue(days) ? "overdue" : "ok";
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="tabular-nums">{t("age", { days })}</span>
      <ExceptionStatus<WaitState>
        value={state}
        normal={["ok"]}
        labels={{ ok: "", overdue: t("overdue") }}
        intents={{ overdue: "warning" }}
      />
    </span>
  );
}

/** Queue A: submitted honors waiting for approval. The backend answers the full list without paging. */
export function PendingHonorsTab({ result }: { result: Loaded<PendingValidation[]> }) {
  const t = useTranslations("queues.classes.pending");
  const router = useRouter();
  const formatDate = useFormatDate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0] ?? 20);
  const [selected, setSelected] = useState<PendingValidation | null>(null);
  const [resolvedIds, setResolvedIds] = useState<ReadonlySet<string>>(new Set());

  const all = useMemo(
    () => (result.ok ? result.data.filter((v) => !resolvedIds.has(String(v.validation_id))) : []),
    [result, resolvedIds],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((v) =>
      `${validationMemberName(v)} ${v.entity?.name ?? ""}`.toLowerCase().includes(needle),
    );
  }, [all, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * limit, currentPage * limit);
  const columns = 5;

  function review(v: PendingValidation) {
    setSelected(v);
  }

  const header = (
    <TableHeader>
      <TableRow>
        <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("columns.member")}</TableHead>
        <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("columns.honor")}</TableHead>
        <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("columns.submitted")}</TableHead>
        <TableHead className="h-9 px-3 text-right text-xs font-medium text-muted-foreground">{t("columns.wait")}</TableHead>
        <RowActionsHead className="h-9 w-32 px-3" />
      </TableRow>
    </TableHeader>
  );

  if (!result.ok) {
    return (
      <DataTableShell>
        <Table>
          {header}
          <TableBody>
            <ErrorStateTableRow
              colSpan={columns}
              kind={result.error.kind}
              {...(result.error.detail ? { detail: result.error.detail } : {})}
              title={t("loadErrorTitle")}
              retry
            />
          </TableBody>
        </Table>
      </DataTableShell>
    );
  }

  if (all.length === 0) {
    return <EmptyState icon={Award} title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full space-y-1.5 sm:w-72">
          <Label htmlFor="pending-honors-search">{t("searchLabel")}</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="pending-honors-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t("searchPlaceholder")}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} variant="no-results" title={t("noResultsTitle")} description={t("noResultsDescription")}>
          <Button type="button" variant="outline" size="sm" onClick={() => setSearch("")}>
            {t("clearSearch")}
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="hidden md:block">
            <DataTableShell>
              <Table>
                {header}
                <TableBody>
                  {rows.map((v) => {
                    const name = validationMemberName(v);
                    return (
                      <TableRow key={String(v.validation_id)}>
                        <TableCell className="px-3 py-2.5 font-medium">{name}</TableCell>
                        <TableCell className="px-3 py-2.5">
                          <button
                            type="button"
                            className="text-left font-medium underline-offset-4 hover:underline"
                            onClick={() => review(v)}
                          >
                            {v.entity?.name ?? "—"}
                          </button>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-muted-foreground tabular-nums">
                          {v.submitted_at ? formatDate(v.submitted_at) : "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right">
                          <WaitCell days={daysWaiting(v.submitted_at)} />
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <RowActions
                            label={name}
                            actions={[]}
                            primary={
                              <Button type="button" size="sm" onClick={() => review(v)}>
                                {t("review")}
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
          </div>

          <ul className="divide-y rounded-xl bg-card md:hidden">
            {rows.map((v) => (
              <li key={String(v.validation_id)} className="py-3 first:pt-3">
                <button type="button" className="w-full px-3 text-left" onClick={() => review(v)}>
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-medium">{v.entity?.name ?? "—"}</span>
                    <WaitCell days={daysWaiting(v.submitted_at)} />
                  </span>
                  <span className="block text-[13px] text-muted-foreground">
                    {validationMemberName(v)}
                    {v.submitted_at ? ` · ${formatDate(v.submitted_at)}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <DataTablePagination
            page={currentPage}
            totalPages={totalPages}
            total={filtered.length}
            limit={limit}
            limitOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        </>
      )}

      <HonorApprovalSheet
        validation={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onResolved={(v) => {
          setResolvedIds((prev) => new Set(prev).add(String(v.validation_id)));
          router.refresh();
        }}
      />
    </div>
  );
}
