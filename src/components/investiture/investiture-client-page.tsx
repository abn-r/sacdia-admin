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
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvestitureClientPage({
  initialEnrollments,
  years,
}: InvestitureClientPageProps) {
  const t = useTranslations("investiture");
  const [enrollments, setEnrollments] =
    useState<PendingEnrollment[]>(initialEnrollments);
  const [selectedYearId, setSelectedYearId] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredEnrollments = useMemo(() => {
    if (selectedYearId === "all") return enrollments;
    const yearId = parseInt(selectedYearId, 10);
    return enrollments.filter(
      (e) => e.ecclesiastical_year?.ecclesiastical_year_id === yearId,
    );
  }, [enrollments, selectedYearId]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const query =
        selectedYearId !== "all"
          ? { ecclesiastical_year_id: parseInt(selectedYearId, 10), page: 1, limit: 100 }
          : { page: 1, limit: 100 };

      const payload = await getPendingInvestitures(query);

      let fresh: PendingEnrollment[] = [];
      if (Array.isArray(payload)) {
        fresh = payload as PendingEnrollment[];
      } else if (payload && typeof payload === "object") {
        const root = payload as Record<string, unknown>;
        if (Array.isArray(root.data)) {
          fresh = root.data as PendingEnrollment[];
        }
      }

      setEnrollments(fresh);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("client.errorRefresh");
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedYearId, t]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {years.length > 0 && (
            <Select value={selectedYearId} onValueChange={setSelectedYearId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder={t("client.allYears")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("client.allYears")}</SelectItem>
                {years.map((year) => (
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
              {filteredEnrollments.length}
            </span>{" "}
            {filteredEnrollments.length === 1
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
        enrollments={filteredEnrollments}
        onRefresh={refresh}
      />
    </div>
  );
}
