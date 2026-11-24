"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Eye, Pencil, Plus, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { ErrorState, ErrorStateTableRow } from "@/components/shared/error-state";
import type { ErrorStateFromError } from "@/lib/api/error-state";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import {
  getClubListId,
  getClubLocalFieldName,
  type ClubListItem,
} from "@/lib/clubs/fetch-list";
import { clubLocationLine, clubSectionCounts } from "@/lib/clubs/list-rows";

type NavigationMode = "push" | "replace";

interface LocalFieldOption {
  label: string;
  value: number;
}

interface ClubsListClientProps {
  items: ClubListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  localFieldOptions: LocalFieldOption[];
  canEdit: boolean;
  /** `clubs.create`: shows «Nuevo club». */
  canCreate?: boolean;
  /** `clubs.bulk_create`: shows «Importar». Independent from `canCreate`. */
  canBulkImport?: boolean;
  /** The list failed to load: header and filters stay, only the content changes. */
  loadError?: ErrorStateFromError;
}

export function ClubsListClient({
  items,
  meta,
  localFieldOptions,
  canEdit,
  canCreate = false,
  canBulkImport = false,
  loadError,
}: ClubsListClientProps) {
  const t = useTranslations("clubs.pages.v2");
  const tList = useTranslations("clubs.pages.list");
  const tc = useTranslations("people.clubs");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const currentSearch =
    searchParams.get("search") ??
    searchParams.get("name") ??
    searchParams.get("q") ??
    "";
  const currentStatusFilter = searchParams.get("active") ?? "all";
  const currentLocalField = searchParams.get("localFieldId") ?? "all";
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    latestParamsRef.current = searchParamsString;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [searchParamsString]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateParam = useCallback(
    (key: string, value: string, mode: NavigationMode = "push") => {
      if (key !== "search" && debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const params = new URLSearchParams(latestParamsRef.current);
      const normalized = value.trim();
      if (!normalized || normalized === "all") {
        params.delete(key);
      } else {
        params.set(key, normalized);
      }
      if (key === "search") {
        params.delete("name");
        params.delete("q");
      }
      params.set("page", "1");
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      if (mode === "replace") {
        router.replace(nextUrl);
      } else {
        router.push(nextUrl);
      }
    },
    [pathname, router],
  );

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const handleSearchInputChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParam("search", value, "replace");
      }, 400);
    },
    [updateParam],
  );

  const hasActiveFilters = Boolean(
    currentSearch || currentStatusFilter !== "all" || currentLocalField !== "all",
  );

  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);
  const showEmptyState = items.length === 0;


  const headRow = (
    <TableRow>
      <TableHead className="pl-5">{tList("colName")}</TableHead>
      <TableHead className="hidden lg:table-cell">{tList("colLocalField")}</TableHead>
      <TableHead className="text-right">{t("colSections")}</TableHead>
      <TableHead>{tList("colStatus")}</TableHead>
      {canEdit && <RowActionsHead />}
    </TableRow>
  );

  const districtLabel = (name: string) => tc("list.districtLine", { name });
  const statusLabels = { active: tList("statusActive"), inactive: tList("statusInactive") };
  const statusIntents = { inactive: flagStatusIntent(false) } as const;

  const rowActions = (clubId: number | null) => [
    {
      label: t("actionView"),
      icon: Eye,
      href: `/dashboard/clubs/${clubId}`,
      hidden: !clubId,
    },
    {
      label: t("actionEdit"),
      icon: Pencil,
      href: `/dashboard/clubs/${clubId}/edit`,
      hidden: !clubId,
    },
  ];

  const errorProps = loadError
    ? {
        kind: loadError.kind,
        detail: loadError.detail,
        icon: Building2,
        retry: true,
        ...(loadError.kind === "error"
          ? { title: tc("list.errorTitle"), description: tc("list.errorDescription") }
          : {}),
      }
    : null;

  const nameCell = (club: ClubListItem, clubId: number | null) => (
    <>
      {clubId ? (
        <Link
          prefetch={false}
          href={`/dashboard/clubs/${clubId}`}
          className="hover:text-primary hover:underline underline-offset-4"
        >
          {club.name ?? "—"}
        </Link>
      ) : (
        (club.name ?? "—")
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={tList("title")}
        description={t("description")}
        actions={
          canBulkImport || canCreate ? (
            <>
              {canBulkImport ? (
                <Button variant="outline" asChild>
                  <Link href="/dashboard/clubs/import">
                    <Upload className="size-4" />
                    {tc("list.importButton")}
                  </Link>
                </Button>
              ) : null}
              {canCreate ? (
                <Button asChild>
                  <Link href="/dashboard/clubs/new">
                    <Plus className="size-4" />
                    {tc("list.createButton")}
                  </Link>
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
              <div className="w-[300px] space-y-1 max-sm:w-full [&_[data-slot=select-trigger]]:w-full">
                <Label htmlFor="clubs-search">{tList("colName")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="clubs-search"
                    placeholder={t("searchPlaceholder")}
                    value={searchInput}
                    onChange={(event) => handleSearchInputChange(event.target.value)}
                    className="bg-background pl-9"
                  />
                </div>
              </div>
              <div className="w-[200px] space-y-1 max-sm:w-full [&_[data-slot=select-trigger]]:w-full">
                <Label htmlFor="clubs-status">{tList("colStatus")}</Label>
                <Select
                  value={currentStatusFilter}
                  onValueChange={(value) => updateParam("active", value)}
                >
                  <SelectTrigger id="clubs-status" className="bg-background">
                    <SelectValue placeholder={tList("colStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("statusAll")}</SelectItem>
                    <SelectItem value="true">{tList("statusActive")}</SelectItem>
                    <SelectItem value="false">{tList("statusInactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[240px] space-y-1 max-sm:w-full [&_[data-slot=select-trigger]]:w-full">
                <Label htmlFor="clubs-local-field">{tList("colLocalField")}</Label>
                <Select
                  value={currentLocalField}
                  onValueChange={(value) => updateParam("localFieldId", value)}
                >
                  <SelectTrigger id="clubs-local-field" className="bg-background">
                    <SelectValue placeholder={tList("colLocalField")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("localFieldAll")}</SelectItem>
                    {localFieldOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
        </div>

        {errorProps ? (
          <>
            <DataTableShell className="hidden md:block">
              <Table>
                <TableHeader>{headRow}</TableHeader>
                <TableBody>
                  <ErrorStateTableRow colSpan={canEdit ? 5 : 4} {...errorProps} />
                </TableBody>
              </Table>
            </DataTableShell>
            <DataTableShell className="md:hidden">
              <ErrorState variant="page" {...errorProps} />
            </DataTableShell>
          </>
        ) : showEmptyState ? (
          <EmptyState
            variant={hasActiveFilters ? "no-results" : "default"}
            icon={hasActiveFilters ? Search : Building2}
            title={hasActiveFilters ? t("emptyFilteredTitle") : tList("emptyTitle")}
            description={
              hasActiveFilters ? t("emptyFilteredDescription") : tList("emptyDescription")
            }
          />
        ) : (
          <>
            <DataTableShell className="hidden md:block">
              <Table>
                <TableHeader>{headRow}</TableHeader>
                <TableBody>
                  {items.map((club, index) => {
                    const clubId = getClubListId(club);
                    const rowKey = clubId
                      ? `club-${clubId}`
                      : `club-idx-${(safePage - 1) * safeLimit + index}`;
                    const counts = clubSectionCounts(club);
                    const location = clubLocationLine(club, districtLabel);

                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="pl-5">
                          <span className="block font-medium">{nameCell(club, clubId)}</span>
                          {location ? (
                            <span className="block text-[13px] text-muted-foreground">
                              {location}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {getClubLocalFieldName(club) ?? club.local_field_id ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {counts ? `${counts.active}/${counts.total}` : "—"}
                        </TableCell>
                        <TableCell>
                          <ExceptionStatus
                            value={club.active === false ? "inactive" : "active"}
                            normal={["active"]}
                            labels={statusLabels}
                            intents={statusIntents}
                          />
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <RowActions
                              label={club.name ?? "—"}
                              actions={rowActions(clubId)}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableShell>

            <DataTableShell className="md:hidden">
              <ul className="divide-y" aria-label={tList("title")}>
                {items.map((club, index) => {
                  const clubId = getClubListId(club);
                  const rowKey = clubId
                    ? `club-m-${clubId}`
                    : `club-m-idx-${(safePage - 1) * safeLimit + index}`;
                  const counts = clubSectionCounts(club);
                  const location = [
                    getClubLocalFieldName(club) ?? club.local_field_id,
                    clubLocationLine(club, districtLabel),
                  ]
                    .filter((value) => value !== null && value !== undefined && value !== "")
                    .join(" · ");

                  return (
                    <li key={rowKey} className="flex items-start gap-2 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate text-sm font-medium">
                            {nameCell(club, clubId)}
                          </span>
                          <span
                            className="shrink-0 text-sm tabular-nums"
                            title={t("colSections")}
                          >
                            {counts ? `${counts.active}/${counts.total}` : "—"}
                          </span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-2 text-[13px] text-muted-foreground">
                          <span className="min-w-0 truncate">{location || "—"}</span>
                          <ExceptionStatus
                            value={club.active === false ? "inactive" : "active"}
                            normal={["active"]}
                            labels={statusLabels}
                            intents={statusIntents}
                          />
                        </p>
                      </div>
                      {canEdit && (
                        <RowActions
                          label={club.name ?? "—"}
                          actions={rowActions(clubId)}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </DataTableShell>

            <DataTablePagination
              page={safePage}
              totalPages={safeTotalPages}
              total={meta.total}
              limit={safeLimit}
            />
          </>
        )}
      </div>
    </div>
  );
}
