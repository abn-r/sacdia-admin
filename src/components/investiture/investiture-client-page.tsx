"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PendingTable } from "@/components/investiture/pending-table";
import { getPendingInvestitures, type PendingEnrollment } from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";
import type { EcclesiasticalYear } from "@/lib/api/catalogs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvestitureClientPageProps {
  initialEnrollments: PendingEnrollment[];
  years: EcclesiasticalYear[];
  initialYearId: number | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvestitureClientPage({
  initialEnrollments,
  years,
  initialYearId,
}: InvestitureClientPageProps) {
  const t = useTranslations("investiture");
  const [enrollments, setEnrollments] =
    useState<PendingEnrollment[]>(initialEnrollments);
  const [selectedYearId, setSelectedYearId] = useState<string>(
    initialYearId ? String(initialYearId) : "all",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const yearOptions = useMemo(
    () =>
      [...years].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return b.start_date.localeCompare(a.start_date);
      }),
    [years],
  );

  const loadEnrollments = useCallback(async (yearId: string) => {
    setIsRefreshing(true);
    try {
      const query =
        yearId !== "all"
          ? { ecclesiastical_year_id: parseInt(yearId, 10), page: 1, limit: 100 }
          : { page: 1, limit: 100 };

      const payload = await getPendingInvestitures(query);
      setEnrollments(payload.data);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("client.errorRefresh");
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [t]);

  const refresh = useCallback(async () => {
    await loadEnrollments(selectedYearId);
  }, [loadEnrollments, selectedYearId]);

  const handleYearChange = useCallback(
    (yearId: string) => {
      setSelectedYearId(yearId);
      void loadEnrollments(yearId);
    },
    [loadEnrollments],
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {years.length > 0 && (
            <Select value={selectedYearId} onValueChange={handleYearChange}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder={t("client.selectYear")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("client.allYears")}</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem
                    key={year.ecclesiastical_year_id}
                    value={String(year.ecclesiastical_year_id)}
                  >
                    {year.name}
                    {year.active && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {t("client.yearActive")}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {enrollments.length}
            </span>{" "}
            {enrollments.length === 1
              ? t("client.countSingular")
              : t("client.countPlural")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {t("client.refresh")}
          </Button>
        </div>
      </div>

      {/* Table */}
      <PendingTable
        enrollments={enrollments}
        onRefresh={refresh}
      />
    </div>
  );
}
