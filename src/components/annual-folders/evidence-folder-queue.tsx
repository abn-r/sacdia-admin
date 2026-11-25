"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FolderSearch, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnnualFolderSetupNotice } from "@/components/annual-folders/annual-folder-setup-notice";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import { getEvaluationQueue } from "@/lib/api/annual-folders";
import type {
  AnnualFolderEvaluationQueueItem,
  FolderTemplate,
} from "@/lib/api/annual-folders";
import type { AnnualRankingConfig } from "@/lib/api/annual-rankings";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";
import { errorStateFromError } from "@/lib/api/error-state";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import {
  CLUBS_EVIDENCE_FOLDERS_TEMPLATES,
  clubsEvidenceFolderPath,
} from "@/lib/clubs/evidence-folders-paths";
import {
  ALL_FILTER,
  DEFAULT_QUEUE_TAB,
  EMPTY_QUEUE_FILTERS,
  QUEUE_PAGE_SIZES,
  QUEUE_TABS,
  buildQueueParams,
  folderPathWithFocus,
  hasActiveQueueFilters,
  parseQueueTab,
  queueTotalPages,
  tabSectionCounts,
  type QueueFilters,
  type QueueTab,
} from "@/lib/evidence-folders/queue";
import { useFormatDate } from "@/lib/format-locale";
import { findAnnualFolderSetupGap } from "@/lib/prerequisites/annual-folder-gaps";

const HEAD = "h-9 px-3 text-xs font-medium text-muted-foreground";
const SEARCH_DEBOUNCE_MS = 300;

interface EvidenceFolderQueueProps {
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  unions: Union[];
  localFields: LocalField[];
  templates: FolderTemplate[];
  rankingConfigs: AnnualRankingConfig[];
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-[200px]">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <NativeSelect
        id={id}
        className="w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value={ALL_FILTER}>{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

export function EvidenceFolderQueue({
  clubTypes,
  ecclesiasticalYears,
  unions,
  localFields,
  templates,
  rankingConfigs,
}: EvidenceFolderQueueProps) {
  const t = useTranslations("evaluation.evidence.queue");
  const tTitle = useTranslations("annual_folders.pageFolders");
  const tFolders = useTranslations("annual_folders");
  const formatDate = useFormatDate();
  const { canViewScreen } = useScreenAccess();
  const active = parseQueueTab(useUrlTab("tab", DEFAULT_QUEUE_TAB));

  const [filters, setFilters] = useState<QueueFilters>(EMPTY_QUEUE_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [paging, setPaging] = useState({ page: 1, limit: 20, key: "" });

  useEffect(() => {
    const handle = setTimeout(
      () => setFilters((current) => ({ ...current, search: searchInput })),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(handle);
  }, [searchInput]);

  const resetKey = `${active}|${JSON.stringify(filters)}`;
  const page = paging.key === resetKey ? paging.page : 1;
  const limit = paging.limit;

  // One query per tab so every tab carries its count; only the active one
  // fetches a full page (the others ask for one row and read `total`).
  const results = useQueries({
    queries: QUEUE_TABS.map((tab) => {
      const isActive = tab === active;
      const tabPage = isActive ? page : 1;
      const tabLimit = isActive ? limit : 1;
      return {
        queryKey: ["evidence-folders", "queue", tab, filters, tabPage, tabLimit],
        queryFn: () =>
          getEvaluationQueue(buildQueueParams(tab, filters, tabPage, tabLimit)),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      };
    }),
  });

  const query = results[QUEUE_TABS.indexOf(active)];
  const rows: AnnualFolderEvaluationQueueItem[] = query?.data?.data ?? [];
  const total = query?.data?.total ?? 0;
  const failure =
    query?.isError && query.data === undefined
      ? errorStateFromError(query.error)
      : null;
  const stale = Boolean(query?.isError && query.data !== undefined);
  const loading = query?.isPending ?? true;
  const filtered = hasActiveQueueFilters(filters);

  const folderSetupGap = findAnnualFolderSetupGap({
    ecclesiasticalYears,
    clubTypes,
    templates,
    rankingConfigs,
  });

  const evaluateTotal = results[QUEUE_TABS.indexOf("evaluate")]?.data?.total;

  const tabs = QUEUE_TABS.map((tab) => {
    const count = results[QUEUE_TABS.indexOf(tab)]?.data?.total;
    return {
      value: tab,
      label: t(`tabs.${tab}`),
      ...(count !== undefined ? { count } : {}),
    };
  });

  const localFieldOptions = useMemo(
    () =>
      localFields
        .filter(
          (field) =>
            filters.unionId === ALL_FILTER ||
            String(field.union_id) === filters.unionId,
        )
        .map((field) => ({
          value: String(field.local_field_id),
          label: field.name,
        })),
    [localFields, filters.unionId],
  );

  function updateFilter(patch: Partial<QueueFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function clearFilters() {
    setSearchInput("");
    setFilters(EMPTY_QUEUE_FILTERS);
  }

  const columnTitle = t(`columns.${active}`);
  const colSpan = 5;

  function dateOf(item: AnnualFolderEvaluationQueueItem) {
    return item.latest_submitted_at
      ? formatDate(item.latest_submitted_at, { day: "numeric", month: "short" })
      : t("cell.noDate");
  }

  function sectionsCell(item: AnnualFolderEvaluationQueueItem) {
    const { count, total: all, rejected } = tabSectionCounts(item, active);
    return (
      <>
        {t("cell.sectionsOf", { count, total: all })}
        {rejected > 0 ? (
          <span className="ml-2 text-muted-foreground">
            {t("cell.rejected", { count: rejected })}
          </span>
        ) : null}
      </>
    );
  }

  function actionsFor(item: AnnualFolderEvaluationQueueItem) {
    const base = clubsEvidenceFolderPath(item.annual_folder_id);
    const label = `${item.club_name} · ${item.club_section_name}`;
    return (
      <RowActions
        label={label}
        primary={
          <Button asChild size="xs" variant={active === "evaluated" ? "outline" : "default"}>
            <Link href={folderPathWithFocus(base, active)}>
              {t(
                active === "evaluate"
                  ? "actions.evaluate"
                  : active === "union"
                    ? "actions.review"
                    : "actions.view",
              )}
            </Link>
          </Button>
        }
        actions={[
          { label: t("actions.viewAsClub"), href: `${base}/view` },
        ]}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={tTitle("titleList")}
        {...(evaluateTotal !== undefined
          ? { description: t("finding", { count: evaluateTotal }) }
          : {})}
        actions={
          canViewScreen("clubs-evidence-folders-templates") ? (
            <Button asChild variant="outline" size="sm">
              <Link href={CLUBS_EVIDENCE_FOLDERS_TEMPLATES}>{t("templates")}</Link>
            </Button>
          ) : undefined
        }
      />

      <AnnualFolderSetupNotice gap={folderSetupGap} />

      {stale && query ? (
        <StaleDataNotice at={query.dataUpdatedAt} onRetry={() => void query.refetch()} />
      ) : null}

      <UrlTabs
        tabs={tabs}
        defaultValue={DEFAULT_QUEUE_TAB}
        ariaLabel={t("tabsLabel")}
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5 sm:max-w-xs">
          <Label htmlFor="evidence-queue-search" className="text-xs text-muted-foreground">
            {t("filters.search")}
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="evidence-queue-search"
              type="search"
              value={searchInput}
              maxLength={100}
              placeholder={t("filters.searchPlaceholder")}
              onChange={(event) => setSearchInput(event.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <FilterSelect
          id="evidence-queue-club-type"
          label={t("filters.clubType")}
          value={filters.clubTypeId}
          onChange={(value) => updateFilter({ clubTypeId: value })}
          allLabel={t("filters.allClubTypes")}
          options={clubTypes.map((type) => ({
            value: String(type.club_type_id),
            label: type.name,
          }))}
        />
        <FilterSelect
          id="evidence-queue-year"
          label={t("filters.year")}
          value={filters.yearId}
          onChange={(value) => updateFilter({ yearId: value })}
          allLabel={t("filters.allYears")}
          options={ecclesiasticalYears.map((year) => ({
            value: String(year.ecclesiastical_year_id),
            label: year.name,
          }))}
        />
        {unions.length > 1 ? (
          <FilterSelect
            id="evidence-queue-union"
            label={t("filters.union")}
            value={filters.unionId}
            onChange={(value) => updateFilter({ unionId: value, localFieldId: ALL_FILTER })}
            allLabel={t("filters.allUnions")}
            options={unions.map((union) => ({
              value: String(union.union_id),
              label: union.name,
            }))}
          />
        ) : null}
        {localFields.length > 1 ? (
          <FilterSelect
            id="evidence-queue-local-field"
            label={t("filters.localField")}
            value={filters.localFieldId}
            onChange={(value) => updateFilter({ localFieldId: value })}
            allLabel={t("filters.allLocalFields")}
            options={localFieldOptions}
          />
        ) : null}
      </div>

      {failure ? (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={HEAD}>{t("columns.folder")}</TableHead>
                <TableHead className={HEAD}>{columnTitle}</TableHead>
                <TableHead className={`${HEAD} text-right`}>{t("columns.evidences")}</TableHead>
                <TableHead className={HEAD}>{t("columns.lastSubmitted")}</TableHead>
                <RowActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              <ErrorStateTableRow
                colSpan={colSpan}
                kind={failure.kind}
                icon={FolderSearch}
                title={t("error.title")}
                description={t("error.description")}
                {...(failure.detail ? { detail: failure.detail } : {})}
                onRetry={() => void query?.refetch()}
              />
            </TableBody>
          </Table>
        </DataTableShell>
      ) : !loading && total === 0 ? (
        filtered ? (
          <EmptyState
            icon={Search}
            variant="no-results"
            title={t("empty.noResultsTitle")}
            description={t("empty.noResultsDescription")}
          >
            <Button variant="outline" size="sm" onClick={clearFilters}>
              {t("empty.clearFilters")}
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            icon={FolderSearch}
            title={t(`empty.${active}.title`)}
            description={
              folderSetupGap
                ? tFolders("setup.emptyHint")
                : t(`empty.${active}.description`)
            }
          />
        )
      ) : (
        <>
          <DataTableShell aria-busy={query?.isFetching} className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={HEAD}>{t("columns.folder")}</TableHead>
                  <TableHead className={HEAD}>{columnTitle}</TableHead>
                  <TableHead className={`${HEAD} text-right`}>{t("columns.evidences")}</TableHead>
                  <TableHead className={HEAD}>{t("columns.lastSubmitted")}</TableHead>
                  <RowActionsHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <TableRow key={`sk-${index}`} className="hover:bg-transparent">
                        <TableCell colSpan={colSpan} className="px-3">
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
                {rows.map((item) => (
                  <TableRow key={item.annual_folder_id}>
                    <TableCell className="px-3">
                      <Link
                        href={folderPathWithFocus(clubsEvidenceFolderPath(item.annual_folder_id), active)}
                        className="font-medium hover:underline"
                      >
                        {item.club_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {[item.club_section_name, item.local_field_name, item.year_label]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </TableCell>
                    <TableCell className="px-3 tabular-nums">{sectionsCell(item)}</TableCell>
                    <TableCell className="px-3 text-right tabular-nums">{item.total_evidences}</TableCell>
                    <TableCell className="px-3 text-muted-foreground tabular-nums">{dateOf(item)}</TableCell>
                    <TableCell className="px-3">{actionsFor(item)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>

          <ul className="divide-y rounded-xl bg-card shadow-card md:hidden" aria-label={t("columns.folder")}>
            {rows.map((item) => (
              <li key={item.annual_folder_id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={folderPathWithFocus(clubsEvidenceFolderPath(item.annual_folder_id), active)}
                    className="block truncate text-sm font-medium"
                  >
                    {item.club_name}
                  </Link>
                  <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                    <span>{item.club_section_name}</span>
                    <span>{sectionsCell(item)}</span>
                    <span>{dateOf(item)}</span>
                  </p>
                </div>
                {actionsFor(item)}
              </li>
            ))}
          </ul>

          <DataTablePagination
            page={page}
            totalPages={queueTotalPages(total, limit)}
            total={total}
            limit={limit}
            limitOptions={[...QUEUE_PAGE_SIZES]}
            onPageChange={(next) => setPaging({ page: next, limit, key: resetKey })}
            onPageSizeChange={(next) => setPaging({ page: 1, limit: next, key: resetKey })}
          />
        </>
      )}
    </div>
  );
}

export type { QueueTab };
