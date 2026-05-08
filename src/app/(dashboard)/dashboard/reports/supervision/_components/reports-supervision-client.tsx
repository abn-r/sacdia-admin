"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
import { getReportPdfUrl } from "@/lib/api/monthly-reports";
import type { AdminReportsPage, AdminReportItem } from "@/lib/api/monthly-reports";
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPeriod(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(date);
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

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
  localFields: LocalField[];
  searchParams: {
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
  localFields,
  searchParams,
}: ReportsSupervisionClientProps) {
  const t = useTranslations("reports.supervisionClient");
  const router = useRouter();

  const currentPage = Number(searchParams.page ?? "1");
  const { total, limit, items } = initialData;
  const totalPages = Math.ceil(total / limit);

  // Month options built from translation keys (values stay stable, labels from t())
  const MONTH_VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
  const STATUS_VALUES = ["draft", "generated", "submitted"] as const;

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

  function handlePage(newPage: number) {
    router.push(buildUrl({ page: String(newPage) }));
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Tipo de club */}
        <Select
          value={searchParams.club_type_id ?? "all"}
          onValueChange={(v) => handleFilter("club_type_id", v)}
        >
          <SelectTrigger className="w-44">
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

        {/* Campo local */}
        <Select
          value={searchParams.local_field_id ?? "all"}
          onValueChange={(v) => handleFilter("local_field_id", v)}
        >
          <SelectTrigger className="w-48">
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

        {/* Mes */}
        <Select
          value={searchParams.month ?? "all"}
          onValueChange={(v) => handleFilter("month", v)}
        >
          <SelectTrigger className="w-36">
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

        {/* Año */}
        <Select
          value={searchParams.year ?? String(new Date().getFullYear())}
          onValueChange={(v) => handleFilter("year", v)}
        >
          <SelectTrigger className="w-28">
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

        {/* Estado */}
        <Select
          value={searchParams.status ?? "all"}
          onValueChange={(v) => handleFilter("status", v)}
        >
          <SelectTrigger className="w-36">
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

      {/* Table */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileText className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            {t("emptyTitle")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {t("emptyHint")}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tableColClub")}</TableHead>
                <TableHead>{t("tableColType")}</TableHead>
                <TableHead>{t("tableColLocalField")}</TableHead>
                <TableHead>{t("tableColPeriod")}</TableHead>
                <TableHead>{t("tableColStatus")}</TableHead>
                <TableHead>{t("tableColGenerated")}</TableHead>
                <TableHead>{t("tableColSubmitted")}</TableHead>
                <TableHead className="text-right">{t("tableColActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.monthly_report_id}>
                  <TableCell className="font-medium">
                    {item.club_name ?? "—"}
                    {item.member_count !== null && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {t("memberCount", { count: item.member_count })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{item.club_type ?? "—"}</TableCell>
                  <TableCell>{item.local_field ?? "—"}</TableCell>
                  <TableCell className="capitalize">
                    {formatPeriod(item.month, item.year)}
                  </TableCell>
                  <TableCell>
                    <ReportStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{formatShortDate(item.generated_at)}</TableCell>
                  <TableCell>{formatShortDate(item.submitted_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/reports/${item.monthly_report_id}`}>
                          {t("actionView")}
                        </Link>
                      </Button>
                      {item.status !== "draft" && (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={getReportPdfUrl(Number(item.monthly_report_id))}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="mr-1 size-3.5" />
                            {t("actionPdf")}
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
