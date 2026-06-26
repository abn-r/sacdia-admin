"use client";

import { FormEvent, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Loader2,
  Mail,
  Search,
  User,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import {
  updateSupportReportStatus,
  type SupportReport,
  type SupportReportCategory,
  type SupportReportStatus,
  type SupportReportsPage,
} from "@/lib/api/support-reports";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<SupportReportStatus, string> = {
  open: "border-red-200 bg-red-50 text-red-700",
  in_progress: "border-amber-200 bg-amber-50 text-amber-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function safeJson(value: unknown, noData: string, contentError: string) {
  if (value == null) return noData;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return contentError;
  }
}

interface SupportReportsClientProps {
  pageData: SupportReportsPage;
  filters: {
    search?: string;
    status?: SupportReportStatus;
    category?: SupportReportCategory;
    page: number;
    limit: number;
  };
}

export function SupportReportsClient({
  pageData,
  filters,
}: SupportReportsClientProps) {
  const t = useTranslations("support.pages.reports");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search ?? "");
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  const statusLabel = (status: SupportReportStatus) =>
    t(`statuses.${status}` as "statuses.open");
  const categoryLabel = (category: SupportReportCategory) =>
    t(`categories.${category}` as "categories.bug");

  function updateFilters(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    params.set("page", "1");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilters({ search: search.trim() || undefined });
  }

  async function handleStatusChange(report: SupportReport, value: string) {
    const status = value as SupportReportStatus;
    setLoadingReportId(report.id);
    try {
      await updateSupportReportStatus(report.id, status);
      toast.success(
        t("toastStatusUpdated", { status: statusLabel(status).toLowerCase() }),
      );
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("updateError");
      toast.error(message);
    } finally {
      setLoadingReportId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(pageData.total / pageData.limit));
  const openCount = pageData.items.filter(
    (item) => item.status === "open",
  ).length;
  const activeCount = pageData.items.filter(
    (item) => item.status === "in_progress",
  ).length;
  const resolvedCount = pageData.items.filter(
    (item) => item.status === "resolved",
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          label={t("summaryOpen")}
          value={openCount}
          icon={AlertCircle}
        />
        <SummaryCard
          label={t("summaryInProgress")}
          value={activeCount}
          icon={Clock3}
        />
        <SummaryCard
          label={t("summaryResolved")}
          value={resolvedCount}
          icon={CheckCircle2}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("filtersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline" disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("searchButton")
              )}
            </Button>
          </form>

          <Select
            value={filters.status ?? "all"}
            onValueChange={(value) => updateFilters({ status: value })}
          >
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder={t("statusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("statusAll")}</SelectItem>
              {(Object.keys(STATUS_STYLES) as SupportReportStatus[]).map(
                (value) => (
                  <SelectItem key={value} value={value}>
                    {statusLabel(value)}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>

          <Select
            value={filters.category ?? "all"}
            onValueChange={(value) => updateFilters({ category: value })}
          >
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder={t("categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("categoryAll")}</SelectItem>
              {(
                [
                  "bug",
                  "feature_request",
                  "account",
                  "data_issue",
                  "performance",
                  "other",
                ] as SupportReportCategory[]
              ).map((value) => (
                <SelectItem key={value} value={value}>
                  {categoryLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {pageData.items.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title={t("emptyFilteredTitle")}
          description={t("emptyFilteredDescription")}
          variant="no-results"
        />
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colReport")}</TableHead>
                <TableHead>{t("colUser")}</TableHead>
                <TableHead>{t("colCategory")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colDate")}</TableHead>
                <TableHead className="w-[190px]">{t("colAttention")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.items.map((report) => (
                <TableRow key={report.id} className="align-top">
                  <TableCell className="min-w-[320px] space-y-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {report.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    </div>
                    <details className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer font-medium text-foreground">
                        {t("technicalContext")}
                      </summary>
                      <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words">
                        {safeJson(
                          {
                            deviceInfo: report.deviceInfo,
                            userContext: report.userContext,
                          },
                          t("noData"),
                          t("contentError"),
                        )}
                      </pre>
                    </details>
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-muted">
                        <User className="size-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {report.user.name ?? t("noName")}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="size-3" />
                          {report.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <Bug className="size-3" />
                      {categoryLabel(report.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("border", STATUS_STYLES[report.status])}
                    >
                      {statusLabel(report.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[150px] text-sm text-muted-foreground">
                    {formatDate(report.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={report.status}
                      disabled={loadingReportId === report.id}
                      onValueChange={(value) =>
                        handleStatusChange(report, value)
                      }
                    >
                      <SelectTrigger className="w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_STYLES) as SupportReportStatus[]).map(
                          (value) => (
                            <SelectItem key={value} value={value}>
                              {statusLabel(value)}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <DataTablePagination
        page={pageData.page}
        totalPages={totalPages}
        total={pageData.total}
        limit={pageData.limit}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
