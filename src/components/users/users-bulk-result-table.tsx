"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BulkUserRowResult } from "@/lib/api/admin-users";
import { bulkErrorCodeKey } from "@/lib/users/bulk-upload-file";

type BulkT = ReturnType<typeof useTranslations<"users.pages.bulk">>;

function failureMessage(t: BulkT, row: BulkUserRowResult): string {
  const key = row.error_code ? bulkErrorCodeKey(row.error_code) : null;
  if (key) return t(`errorCodes.${key}`);
  return row.error_message ?? row.error_code ?? t("toast.generic");
}

type Tab = "failed" | "all";

/** Result of the send, rows numbered like the user's sheet. */
export function UsersBulkResultTable({ results }: { results: BulkUserRowResult[] }) {
  const t = useTranslations("users.pages.bulk");
  const tNew = useTranslations("people.users.bulk");
  const failed = useMemo(() => results.filter((row) => row.status === "error"), [results]);
  const [tab, setTab] = useState<Tab>(failed.length > 0 ? "failed" : "all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const visible = tab === "failed" ? failed : results;
  const totalPages = Math.max(1, Math.ceil(visible.length / limit));
  const current = Math.min(page, totalPages);
  const pageRows = visible.slice((current - 1) * limit, current * limit);

  return (
    <Tabs
      value={tab}
      onValueChange={(next) => {
        setTab(next === "failed" ? "failed" : "all");
        setPage(1);
      }}
      className="gap-3"
    >
      <TabsList variant="line" aria-label={tNew("result.tabsLabel")}>
        <TabsTrigger value="failed">
          {tNew("result.tabFailed")}
          <span className="ml-1.5 tabular-nums text-muted-foreground">{failed.length}</span>
        </TabsTrigger>
        <TabsTrigger value="all">
          {tNew("review.tabAll")}
          <span className="ml-1.5 tabular-nums text-muted-foreground">{results.length}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value={tab} className="space-y-3">
        {visible.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={tNew("result.noFailedTitle")}
            description={tNew("result.noFailedDescription")}
          />
        ) : (
          <>
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 pl-6">{t("results.rowHeader")}</TableHead>
                    <TableHead>{t("results.emailHeader")}</TableHead>
                    <TableHead>{t("results.detailHeader")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => {
                    const isError = row.status === "error";
                    return (
                      <TableRow key={row.row} data-state={isError ? "selected" : undefined}>
                        <TableCell className="pl-6 tabular-nums text-muted-foreground">{row.row}</TableCell>
                        <TableCell className="max-w-[280px] truncate text-sm">{row.email ?? "—"}</TableCell>
                        <TableCell className="whitespace-normal">
                          {isError ? (
                            <span className="text-[13px] text-destructive">{failureMessage(t, row)}</span>
                          ) : (
                            <span className="text-[13px] text-muted-foreground">
                              {row.invite_email_sent ? t("results.inviteSent") : t("results.inviteNotSent")}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableShell>
            <DataTablePagination
              page={current}
              totalPages={totalPages}
              total={visible.length}
              limit={limit}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}
