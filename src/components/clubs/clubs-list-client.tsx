"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Eye, MoreHorizontal, Pencil, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import {
  getClubChurchName,
  getClubDistrictName,
  getClubListId,
  getClubLocalFieldName,
  type ClubListItem,
} from "@/lib/clubs/fetch-list";

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
}

function matchesSearch(club: ClubListItem, query: string): boolean {
  const haystack = [
    club.name,
    getClubLocalFieldName(club),
    getClubDistrictName(club),
    getClubChurchName(club),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function ClubsListClient({
  items,
  meta,
  localFieldOptions,
  canEdit,
}: ClubsListClientProps) {
  const t = useTranslations("clubs.pages.v2");
  const tList = useTranslations("clubs.pages.list");
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

  const filteredItems = useMemo(() => {
    const query = currentSearch.trim().toLowerCase();
    if (!query) return items;
    return items.filter((club) => matchesSearch(club, query));
  }, [currentSearch, items]);

  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);
  const showEmptyState = items.length === 0 || filteredItems.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader title={tList("title")} description={t("description")} />

      <div className="space-y-4">
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">
              {t("filtersTitle")}
            </h3>
            <span className="text-xs text-muted-foreground">{t("filtersHint")}</span>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-end gap-4">
              <div className="w-[300px] space-y-1">
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
              <div className="w-[200px] space-y-1">
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
              <div className="w-[240px] space-y-1">
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
          </div>
        </div>

        {showEmptyState ? (
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
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">{tList("colName")}</TableHead>
                    <TableHead>{tList("colLocalField")}</TableHead>
                    <TableHead>{tList("colDistrict")}</TableHead>
                    <TableHead>{tList("colChurch")}</TableHead>
                    <TableHead>{t("colSections")}</TableHead>
                    <TableHead>{tList("colStatus")}</TableHead>
                    {canEdit && (
                      <TableHead className="sticky right-0 z-20 w-[100px] border-l bg-background">
                        {tList("colActions")}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((club, index) => {
                    const clubId = getClubListId(club);
                    const rowKey = clubId
                      ? `club-${clubId}`
                      : `club-idx-${(safePage - 1) * safeLimit + index}`;
                    const sections = Array.isArray(club.club_sections)
                      ? club.club_sections
                      : [];
                    const activeSections = sections.filter(
                      (section) => section.active !== false,
                    ).length;

                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="pl-5 font-medium">
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
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getClubLocalFieldName(club) ?? club.local_field_id ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getClubDistrictName(club) ?? club.district_id ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getClubChurchName(club) ?? club.church_id ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm tabular-nums">
                          {sections.length > 0
                            ? `${activeSections}/${sections.length}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={club.active !== false ? "default" : "outline"}
                            className="text-xs"
                          >
                            {club.active !== false
                              ? tList("statusActive")
                              : tList("statusInactive")}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell className="sticky right-0 z-10 border-l bg-background">
                            <div className="hidden gap-1 md:flex">
                              {clubId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  asChild
                                  title={t("actionView")}
                                >
                                  <Link prefetch={false} href={`/dashboard/clubs/${clubId}`}>
                                    <Eye className="size-3.5" />
                                  </Link>
                                </Button>
                              )}
                              {clubId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  asChild
                                  title={t("actionEdit")}
                                >
                                  <Link
                                    prefetch={false}
                                    href={`/dashboard/clubs/${clubId}?tab=edit`}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                            <div className="md:hidden">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {clubId && (
                                    <DropdownMenuItem asChild>
                                      <Link prefetch={false} href={`/dashboard/clubs/${clubId}`}>
                                        <Eye className="size-4" />
                                        {t("actionView")}
                                      </Link>
                                    </DropdownMenuItem>
                                  )}
                                  {clubId && (
                                    <DropdownMenuItem asChild>
                                      <Link
                                        prefetch={false}
                                        href={`/dashboard/clubs/${clubId}?tab=edit`}
                                      >
                                        <Pencil className="size-4" />
                                        {t("actionEdit")}
                                      </Link>
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

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
