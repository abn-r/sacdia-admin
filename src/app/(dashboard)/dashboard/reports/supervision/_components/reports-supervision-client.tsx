"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  Eye,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { triggerMonthlyReportPdfDownload } from "@/lib/api/monthly-reports";
import type { AdminReportsPage, AdminReportItem } from "@/lib/api/monthly-reports";
import type { ClubType } from "@/lib/api/catalogs";
import type { Division, LocalField, Union } from "@/lib/api/geography";
import type { AdminTerritoryScope } from "@/lib/auth/territory-scope";
import { useFormatDate } from "@/lib/format-locale";
import { capitalizeFirst } from "@/lib/utils";

function ReportStatusBadge({ status }: { status: AdminReportItem["status"] }) {
  const t = useTranslations("reports.supervisionClient");
  if (status === "submitted") {
    return <StatusBadge intent="success" label={t("statusOptions.submitted")} />;
  }
  if (status === "generated") {
    return <StatusBadge intent="neutral" label={t("statusOptions.generated")} />;
  }
  return <StatusBadge intent="neutral" label={t("statusOptions.draft")} />;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReportsSupervisionClientProps {
  initialData: AdminReportsPage;
  clubTypes: ClubType[];
  divisions: Division[];
  unions: Union[];
  localFields: LocalField[];
  territoryScope: AdminTerritoryScope;
  searchParams: {
    division_id?: string;
    union_id?: string;
    club_type_id?: string;
    local_field_id?: string;
    year?: string;
    month?: string;
    status?: string;
    page?: string;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportsSupervisionClient({
  initialData,
  clubTypes,
  divisions,
  unions,
  localFields,
  searchParams,
  territoryScope,
}: ReportsSupervisionClientProps) {
  const t = useTranslations("reports.supervisionClient");
  const router = useRouter();
  const formatDate = useFormatDate();
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  const currentPage = Number(searchParams.page ?? "1");
  const { total, limit, items } = initialData;
  const totalPages = Math.ceil(total / limit);

  // Month options built from translation keys (values stay stable, labels from t())
  const MONTH_VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
  const STATUS_VALUES = ["draft", "generated", "submitted"] as const;
  const divisionLocked = territoryScope.level !== "all";
  const unionLocked = territoryScope.level === "union" || territoryScope.level === "local_field";
  const localFieldLocked = territoryScope.level === "local_field";

  // ─── URL builder ────────────────────────────────────────────────────────────

  function buildUrl(overrides: Record<string, string | undefined>) {
    const next = {
      ...searchParams,
      ...overrides,
    };
    const qs = new URLSearchParams();
    for (const [key, val] of Object.entries(next)) {
      if (val !== undefined && val !== "" && val !== "all") {
        qs.set(key, val);
      }
    }
    const queryString = qs.toString();
    return `/dashboard/reports/supervision${queryString ? `?${queryString}` : ""}`;
  }

  function handleFilter(key: string, value: string) {
    router.push(buildUrl({ [key]: value === "all" ? undefined : value, page: "1" }));
  }

  function handleHierarchyFilter(
    key: "division_id" | "union_id" | "local_field_id",
    value: string,
  ) {
    const normalized = value === "all" ? undefined : value;

    if (key === "division_id") {
      router.push(
        buildUrl({
          division_id: normalized,
          union_id: undefined,
          local_field_id: undefined,
          page: "1",
        }),
      );
      return;
    }

    if (key === "union_id") {
      router.push(
        buildUrl({
          union_id: normalized,
          local_field_id: undefined,
          page: "1",
        }),
      );
      return;
    }

    handleFilter(key, value);
  }

  async function handleDownloadPdf(item: AdminReportItem) {
    setDownloadingReportId(item.monthly_report_id);
    try {
      await triggerMonthlyReportPdfDownload(item.monthly_report_id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("emptyHint"));
    } finally {
      setDownloadingReportId(null);
    }
  }

  function handlePage(newPage: number) {
    router.push(buildUrl({ page: String(newPage) }));
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* División */}
        <div className="space-y-1.5">
          <Label htmlFor="sup-filter-division">{t("filterDivisionPlaceholder")}</Label>
          <Select
            value={searchParams.division_id ?? "all"}
            onValueChange={(v) => handleHierarchyFilter("division_id", v)}
            disabled={divisionLocked}
          >
            <SelectTrigger id="sup-filter-division" className="w-48">
              <SelectValue placeholder={t("filterDivisionPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterDivisionAll")}</SelectItem>
              {divisions.map((division) => (
                <SelectItem key={division.division_id} value={String(division.division_id)}>
                  {division.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Unión */}
        <div className="space-y-1.5">
          <Label htmlFor="sup-filter-union">{t("filterUnionPlaceholder")}</Label>
          <Select
            value={searchParams.union_id ?? "all"}
            onValueChange={(v) => handleHierarchyFilter("union_id", v)}
            disabled={unionLocked}
          >
            <SelectTrigger id="sup-filter-union" className="w-48">
              <SelectValue placeholder={t("filterUnionPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterUnionAll")}</SelectItem>
              {unions.map((union) => (
                <SelectItem key={union.union_id} value={String(union.union_id)}>
                  {union.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de club */}
        <div className="space-y-1.5">
          <Label htmlFor="sup-filter-club-type">{t("filterClubTypePlaceholder")}</Label>
          <Select
            value={searchParams.club_type_id ?? "all"}
            onValueChange={(v) => handleFilter("club_type_id", v)}
          >
            <SelectTrigger id="sup-filter-club-type" className="w-44">
              <SelectValue placeholder={t("filterClubTypePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterClubTypeAll")}</SelectItem>
              {clubTypes.map((ct) => (
                <SelectItem key={ct.club_type_id} value={String(ct.club_type_id)}>
                  {ct.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Campo local */}
        <div className="space-y-1.5">
          <Label htmlFor="sup-filter-local-field">{t("filterLocalFieldPlaceholder")}</Label>
          <Select
            value={searchParams.local_field_id ?? "all"}
            onValueChange={(v) => handleHierarchyFilter("local_field_id", v)}
            disabled={localFieldLocked}
          >
            <SelectTrigger id="sup-filter-local-field" className="w-48">
              <SelectValue placeholder={t("filterLocalFieldPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterLocalFieldAll")}</SelectItem>
              {localFields.map((lf) => (
                <SelectItem key={lf.local_field_id} value={String(lf.local_field_id)}>
                  {lf.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mes */}
        <div className="space-y-1.5">
          <Label htmlFor="sup-filter-month">{t("filterMonthPlaceholder")}</Label>
          <Select
            value={searchParams.month ?? "all"}
            onValueChange={(v) => handleFilter("month", v)}
          >
            <SelectTrigger id="sup-filter-month" className="w-36">
              <SelectValue placeholder={t("filterMonthPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterMonthAll")}</SelectItem>
              {MONTH_VALUES.map((v) => (
                <SelectItem key={v} value={v}>
                  {t(`months.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Año */}
        <div className="space-y-1.5">
          <Label htmlFor="sup-filter-year">{t("filterYearPlaceholder")}</Label>
          <Select
            value={searchParams.year ?? String(new Date().getFullYear())}
            onValueChange={(v) => handleFilter("year", v)}
          >
            <SelectTrigger id="sup-filter-year" className="w-28">
              <SelectValue placeholder={t("filterYearPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
                (y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Estado */}
        <div className="space-y-1.5">
          <Label htmlFor="sup-filter-status">{t("filterStatusPlaceholder")}</Label>
          <Select
            value={searchParams.status ?? "all"}
            onValueChange={(v) => handleFilter("status", v)}
          >
            <SelectTrigger id="sup-filter-status" className="w-36">
              <SelectValue placeholder={t("filterStatusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterStatusAll")}</SelectItem>
              {STATUS_VALUES.map((v) => (
                <SelectItem key={v} value={v}>
                  {t(`statusOptions.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("emptyTitle")}
          description={t("emptyHint")}
        />
      ) : (
        <>
        <DataTableShell>
          <Table className="max-md:block">
            <TableHeader className="max-md:sr-only">
              <TableRow>
                <TableHead>{t("tableColClub")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("tableColType")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("tableColLocalField")}</TableHead>
                <TableHead>{t("tableColPeriod")}</TableHead>
                <TableHead>{t("tableColStatus")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("tableColGenerated")}</TableHead>
                <TableHead>{t("tableColSubmitted")}</TableHead>
                <RowActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {items.map((item) => {
                const period = capitalizeFirst(
                  formatDate(new Date(item.year, item.month - 1, 1), {
                    month: "long",
                    year: "numeric",
                  }),
                );
                return (
                  <TableRow
                    key={item.monthly_report_id}
                    className="max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-1 max-md:px-4 max-md:py-3"
                  >
                    <TableCell className="font-medium max-md:order-1 max-md:min-w-0 max-md:flex-1 max-md:p-0 max-md:whitespace-normal">
                      <Link
                        href={`/dashboard/reports/${item.monthly_report_id}`}
                        className="hover:underline"
                      >
                        {item.club_name ?? "—"}
                      </Link>
                      {item.member_count !== null && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {t("memberCount", { count: item.member_count })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell max-md:order-6 max-md:block max-md:p-0 max-md:text-[13px] max-md:text-muted-foreground">{item.club_type ?? "—"}</TableCell>
                    <TableCell className="hidden xl:table-cell max-md:order-7 max-md:block max-md:p-0 max-md:text-[13px] max-md:text-muted-foreground">{item.local_field ?? "—"}</TableCell>
                    <td aria-hidden="true" className="hidden max-md:order-4 max-md:block max-md:h-0 max-md:basis-full" />
                    <TableCell className="max-md:order-5 max-md:p-0 max-md:text-[13px] max-md:text-muted-foreground">{period}</TableCell>
                    <TableCell className="max-md:order-2 max-md:p-0">
                      <ReportStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell max-md:hidden">{item.generated_at ? formatDate(item.generated_at) : "—"}</TableCell>
                    <TableCell className="max-md:order-8 max-md:p-0 max-md:text-[13px] max-md:text-muted-foreground">{item.submitted_at ? formatDate(item.submitted_at) : "—"}</TableCell>
                    <TableCell className="max-md:order-3 max-md:p-0">
                      <RowActions
                        label={[
                          item.club_name ?? String(item.monthly_report_id),
                          item.club_type,
                          period,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        actions={[
                          {
                            label: t("actionView"),
                            icon: Eye,
                            href: `/dashboard/reports/${item.monthly_report_id}`,
                          },
                          {
                            label: t("actionPdf"),
                            icon: Download,
                            onSelect: () => handleDownloadPdf(item),
                            disabled: downloadingReportId === item.monthly_report_id,
                            hidden: item.status === "draft",
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
        </>
      )}

      {/* Pagination */}
      {items.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t("paginationTotal", { total })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePage(currentPage - 1)}
            >
              <ChevronLeft className="size-4" />
              {t("paginationPrev")}
            </Button>
            <span className="tabular-nums">
              {t("paginationPage", { page: currentPage, totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * limit >= total}
              onClick={() => handlePage(currentPage + 1)}
            >
              {t("paginationNext")}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
