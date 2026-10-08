"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CalendarRange, MapPinOff, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { PageHeader } from "@/components/shared/page-header";
import {
  EcclesiasticalYearSelect,
  type EcclesiasticalYear,
} from "@/components/shared/selectors/ecclesiastical-year-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InvestitureRequest } from "@/lib/api/investiture-requests";
import { formatCivilDate, formatInstantDate } from "./format-date";

export interface RequestsListLoadError {
  status: number | null;
  /** Backend error code, when the failure carried one. */
  code?: string | null;
  message: string;
}

export interface RequestsListClientPageProps {
  requests: InvestitureRequest[];
  /** Year being shown; null when the catalog has no usable year. */
  yearId: number | null;
  years: EcclesiasticalYear[];
  loadError: RequestsListLoadError | null;
  /**
   * True when the viewer's only admin role is pastor. A pastor with no
   * districts is refused by the backend (403 INVESTITURE_REQUEST_FORBIDDEN);
   * that is an expected empty state for them, not an access problem.
   */
  isPastorOnly?: boolean;
}

const DETAIL_BASE_PATH = "/dashboard/investiture-requests";

function sortBySoonestDate(requests: InvestitureRequest[]): InvestitureRequest[] {
  return [...requests].sort((a, b) => {
    const left = a.earliest_investiture_date ?? null;
    const right = b.earliest_investiture_date ?? null;
    if (left === right) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return left.localeCompare(right);
  });
}

export function RequestsListClientPage({
  requests,
  yearId,
  years,
  loadError,
  isPastorOnly = false,
}: RequestsListClientPageProps) {
  const t = useTranslations("investiture_requests.list");
  const locale = useLocale();
  const router = useRouter();

  const sorted = useMemo(() => sortBySoonestDate(requests), [requests]);

  function handleYearChange(nextYearId: number | null) {
    if (nextYearId === null || nextYearId === yearId) return;
    router.push(`${DETAIL_BASE_PATH}?year=${nextYearId}`);
  }

  const noValue = t("noValue");
  const pastorWithoutDistricts =
    isPastorOnly &&
    loadError?.status === 403 &&
    (loadError.code == null || loadError.code === "INVESTITURE_REQUEST_FORBIDDEN");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="w-56">
            <EcclesiasticalYearSelect
              value={yearId}
              onChange={handleYearChange}
              years={years}
              activeOnly={false}
              placeholder={t("yearPlaceholder")}
            />
          </div>
        }
      />

      {loadError && pastorWithoutDistricts && (
        <EmptyState
          icon={MapPinOff}
          title={t("noDistrictsTitle")}
          description={t("noDistrictsDescription")}
        />
      )}

      {loadError && !pastorWithoutDistricts && (
        <EndpointErrorBanner
          state={loadError.status === 403 ? "forbidden" : "missing"}
          detail={loadError.message}
        />
      )}

      {!loadError && yearId === null && (
        <EmptyState
          icon={CalendarRange}
          title={t("noYearTitle")}
          description={t("noYearDescription")}
        />
      )}

      {!loadError && yearId !== null && sorted.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      )}

      {!loadError && sorted.length > 0 && (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.club")}</TableHead>
                <TableHead>{t("columns.section")}</TableHead>
                <TableHead>{t("columns.district")}</TableHead>
                <TableHead className="text-right">{t("columns.pending")}</TableHead>
                <TableHead>{t("columns.nextDate")}</TableHead>
                <TableHead>{t("columns.submitted")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((request) => {
                const href = `${DETAIL_BASE_PATH}/${encodeURIComponent(request.request_id)}`;
                return (
                  <TableRow
                    key={request.request_id}
                    className="cursor-pointer"
                    onClick={() => router.push(href)}
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={href}
                        prefetch={false}
                        className="hover:underline focus-visible:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {request.club_name ?? noValue}
                      </Link>
                    </TableCell>
                    <TableCell>{request.section_name ?? noValue}</TableCell>
                    <TableCell>{request.district_name ?? noValue}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {request.pending_count ?? 0}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatCivilDate(request.earliest_investiture_date, locale) ?? noValue}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatInstantDate(request.created_at, locale) ?? noValue}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}
