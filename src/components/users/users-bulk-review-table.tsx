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
import type { BulkIssue, BulkReviewRow } from "@/lib/users/bulk-review";

type BulkT = ReturnType<typeof useTranslations<"people.users.bulk">>;

/** One review issue, in words. */
export function bulkIssueMessage(t: BulkT, issue: BulkIssue): string {
  switch (issue.code) {
    case "missingRequired":
      return t("issues.missingRequired", {
        fields: issue.fields.map((field) => t(`fields.${field}`)).join(", "),
      });
    case "emailInvalid":
      return t("issues.emailInvalid", { value: issue.value });
    case "duplicateEmail":
      return t("issues.duplicateEmail", { row: issue.row });
    case "roleUnknown":
      return t("issues.roleUnknown", { value: issue.value });
    case "roleNotAllowed":
      return t("issues.roleNotAllowed", { value: issue.value });
    case "localFieldRequired":
      return t("issues.localFieldRequired");
    case "countryUnknown":
      return t("issues.countryUnknown", { value: issue.value });
    case "unionUnknown":
      return t("issues.unionUnknown", { value: issue.value });
    case "localFieldUnknown":
      return t("issues.localFieldUnknown", { value: issue.value });
    case "unionOutsideCountry":
      return t("issues.unionOutsideCountry", { value: issue.value, parent: issue.parent });
    case "localFieldOutsideUnion":
      return t("issues.localFieldOutsideUnion", { value: issue.value, parent: issue.parent });
    case "ambiguous":
      return t("issues.ambiguous", { value: issue.value });
    case "tooLong":
      return t("issues.tooLong", { field: t(`fields.${issue.field}`), max: issue.max });
  }
}

export interface UsersBulkReviewTableProps {
  rows: BulkReviewRow[];
  roleLabel: (slug: string) => string;
}

type Tab = "errors" | "all";

/** Whole-file review: "Con errores" / "Todas", error rows tinted, issues in words. */
export function UsersBulkReviewTable({ rows, roleLabel }: UsersBulkReviewTableProps) {
  const t = useTranslations("people.users.bulk");
  const errorRows = useMemo(() => rows.filter((row) => row.issues.length > 0), [rows]);
  const [tab, setTab] = useState<Tab>(errorRows.length > 0 ? "errors" : "all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const visible = tab === "errors" ? errorRows : rows;
  const totalPages = Math.max(1, Math.ceil(visible.length / limit));
  const current = Math.min(page, totalPages);
  const pageRows = visible.slice((current - 1) * limit, current * limit);

  function changeTab(next: string) {
    setTab(next === "errors" ? "errors" : "all");
    setPage(1);
  }

  return (
    <Tabs value={tab} onValueChange={changeTab} className="gap-3">
      <TabsList variant="line" aria-label={t("review.tabsLabel")}>
        <TabsTrigger value="errors">
          {t("review.tabErrors")}
          <span className="ml-1.5 tabular-nums text-muted-foreground">{errorRows.length}</span>
        </TabsTrigger>
        <TabsTrigger value="all">
          {t("review.tabAll")}
          <span className="ml-1.5 tabular-nums text-muted-foreground">{rows.length}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value={tab} className="space-y-3">
        {visible.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={t("review.noErrorsTitle")}
            description={t("review.noErrorsDescription")}
          />
        ) : (
          <>
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 pl-6">{t("review.colRow")}</TableHead>
                    <TableHead>{t("review.colPerson")}</TableHead>
                    <TableHead>{t("review.colRole")}</TableHead>
                    <TableHead>{t("review.colReview")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => {
                    const hasIssues = row.issues.length > 0;
                    const person = [row.name, row.paternalLastName, row.maternalLastName]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <TableRow key={row.row} data-state={hasIssues ? "selected" : undefined}>
                        <TableCell className="pl-6 tabular-nums text-muted-foreground">{row.row}</TableCell>
                        <TableCell className="max-w-[260px]">
                          <span className="block truncate text-sm font-medium">{person || "—"}</span>
                          <span className="block truncate text-[13px] text-muted-foreground">
                            {row.email || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.role ? roleLabel(row.role) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="min-w-56 whitespace-normal">
                          {hasIssues ? (
                            <ul className="space-y-0.5 text-[13px] text-destructive">
                              {row.issues.map((issue, index) => (
                                <li key={index}>{bulkIssueMessage(t, issue)}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-[13px] text-muted-foreground">{t("review.ready")}</span>
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
