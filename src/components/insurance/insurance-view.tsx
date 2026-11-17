"use client";

import { useState, useCallback } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { InsuranceTable } from "@/components/insurance/insurance-table";
import { ApiError } from "@/lib/api/client";
import {
  getSectionInsuranceOverviewFromClient,
  type SectionInsuranceOverview,
} from "@/lib/api/insurance";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import type { LocalField } from "@/lib/api/geography";
import type { AdminTerritoryScope } from "@/lib/auth/territory-scope";
import { useFormatCurrency, useFormatDate } from "@/lib/format-locale";

type Club = {
  club_id: number;
  name: string;
  local_field_id?: number;
};

type Section = {
  club_section_id: number;
  club_type_id: number;
  name: string;
};

interface InsuranceViewProps {
  clubs: Club[];
  sectionsByClub: Record<number, Section[]>;
  localFields: LocalField[];
  territoryScope: AdminTerritoryScope;
  initialOverview: SectionInsuranceOverview | null;
  initialClubId: number | null;
  initialSectionId: number | null;
  initialLocalFieldId: number | "all";
}

function SummaryItem({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
        {value}
      </dd>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function InsuranceView({
  clubs,
  sectionsByClub,
  localFields,
  territoryScope,
  initialOverview,
  initialClubId,
  initialSectionId,
  initialLocalFieldId,
}: InsuranceViewProps) {
  const t = useTranslations("insurance");
  const { canViewScreen } = useScreenAccess();
  const formatDateLocale = useFormatDate();
  const formatCurrency = useFormatCurrency();
  const canOpenPaymentOrders = canViewScreen("payment-orders");
  const isLocalFieldLocked = territoryScope.level === "local_field";
  const [selectedLocalFieldId, setSelectedLocalFieldId] = useState<number | "all">(
    isLocalFieldLocked ? territoryScope.localFieldId : initialLocalFieldId,
  );
  const [selectedClubId, setSelectedClubId] = useState<number | null>(initialClubId);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(initialSectionId);
  const [overview, setOverview] = useState<SectionInsuranceOverview | null>(initialOverview);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const filteredClubs =
    selectedLocalFieldId === "all"
      ? clubs
      : clubs.filter((club) => club.local_field_id === selectedLocalFieldId);

  const sections = selectedClubId ? (sectionsByClub[selectedClubId] ?? []) : [];

  const loadOverview = useCallback(async (sectionId: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setOverview(await getSectionInsuranceOverviewFromClient(sectionId));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t("view.load_error"));
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  function handleLocalFieldChange(value: string) {
    setSelectedLocalFieldId(value === "all" ? "all" : Number(value));
    setSelectedClubId(null);
    setSelectedSectionId(null);
    setOverview(null);
    setLoadError(null);
  }

  function handleClubChange(value: string) {
    setSelectedClubId(Number(value));
    setSelectedSectionId(null);
    setOverview(null);
    setLoadError(null);
  }

  function handleSectionChange(value: string) {
    const sectionId = Number(value);
    setSelectedSectionId(sectionId);
    void loadOverview(sectionId);
  }

  function handleRefresh() {
    if (selectedSectionId) void loadOverview(selectedSectionId);
  }

  function formatDate(value: string): string {
    try {
      return formatDateLocale(value, { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return value;
    }
  }

  const showContent = Boolean(selectedSectionId) && !loadError && !isLoading && overview;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          {/* Local field selector */}
          <div className="space-y-1 max-sm:w-full">
            <Label htmlFor="insurance-filter-local-field">{t("view.filter_local_field")}</Label>
            <Select
              value={
                selectedLocalFieldId === "all"
                  ? "all"
                  : String(selectedLocalFieldId)
              }
              onValueChange={handleLocalFieldChange}
              disabled={isLocalFieldLocked}
            >
              <SelectTrigger id="insurance-filter-local-field" className="h-9 w-52 max-sm:w-full">
                <SelectValue placeholder={t("view.select_local_field_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {!isLocalFieldLocked && (
                  <SelectItem value="all">{t("view.local_field_all")}</SelectItem>
                )}
                {localFields.map((lf) => (
                  <SelectItem
                    key={lf.local_field_id}
                    value={String(lf.local_field_id)}
                  >
                    {lf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Club selector */}
          <div className="space-y-1 max-sm:w-full">
            <Label htmlFor="insurance-filter-club">{t("view.filter_club")}</Label>
            <Select
              value={selectedClubId ? String(selectedClubId) : ""}
              onValueChange={handleClubChange}
              disabled={filteredClubs.length === 0}
            >
              <SelectTrigger id="insurance-filter-club" className="h-9 w-52 max-sm:w-full">
                <SelectValue placeholder={t("view.select_club_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {filteredClubs.map((club) => (
                  <SelectItem key={club.club_id} value={String(club.club_id)}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section selector */}
          <div className="space-y-1 max-sm:flex-1">
            <Label htmlFor="insurance-filter-section">{t("view.filter_section")}</Label>
            <Select
              value={selectedSectionId ? String(selectedSectionId) : ""}
              onValueChange={handleSectionChange}
              disabled={!selectedClubId || sections.length === 0}
            >
              <SelectTrigger id="insurance-filter-section" className="h-9 w-48 max-sm:w-full">
                <SelectValue placeholder={t("view.select_section_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.club_section_id} value={String(s.club_section_id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={!selectedSectionId || isLoading}
            title={t("view.refresh_tooltip")}
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">{t("view.refresh_tooltip")}</span>
          </Button>
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Prompt to select section */}
      {!selectedSectionId && !loadError && (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          {t("view.prompt_select")}
        </div>
      )}

      {selectedSectionId && isLoading && (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          {t("view.loading")}
        </div>
      )}

      {showContent && !overview.year && (
        <EmptyState
          icon={ShieldCheck}
          title={t("view.no_year_title")}
          description={t("view.no_year_description")}
        />
      )}

      {showContent && overview.year && !overview.cycle && (
        <EmptyState
          icon={ShieldCheck}
          title={t("view.no_cycle_title")}
          description={t("view.no_cycle_description", { year: overview.year.label })}
        />
      )}

      {showContent && overview.year && overview.cycle && (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryItem
              label={t("summary.covered")}
              value={t("summary.covered_of_total", {
                covered: overview.counts.covered,
                total: overview.counts.total,
              })}
            />
            <SummaryItem
              label={t("summary.in_process")}
              value={String(overview.counts.in_process)}
            />
            <SummaryItem
              label={t("summary.uninsured")}
              value={String(overview.counts.uninsured)}
            />
            <SummaryItem
              label={t("summary.free_coverages")}
              value={String(overview.free_coverages_count)}
              hint={t("summary.free_coverages_hint")}
            />
            <SummaryItem label={t("summary.year")} value={overview.year.label} />
            <SummaryItem
              label={t("summary.unit_cost")}
              value={formatCurrency(Number(overview.cycle.unit_cost), overview.cycle.currency)}
            />
            <SummaryItem
              label={t("summary.purchase_deadline")}
              value={formatDate(overview.cycle.purchase_deadline)}
            />
          </dl>

          <InsuranceTable
            people={overview.people}
            canOpenPaymentOrders={canOpenPaymentOrders}
          />
        </>
      )}
    </div>
  );
}
