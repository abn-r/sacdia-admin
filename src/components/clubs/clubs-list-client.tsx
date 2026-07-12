"use client";

import { usePanelPath } from "@/lib/v2/panel-path-context";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { ClubsCreateMenu } from "@/components/clubs/clubs-create-menu";
import { ClubsTable } from "@/components/clubs/clubs-table";
import { useClubsFilters } from "@/components/clubs/use-clubs-filters";
import type { ClubListItem } from "@/lib/clubs/fetch-list";
import { getClubListId } from "@/lib/clubs/fetch-list";

interface LocalFieldOption {
  label: string;
  value: number;
}

interface ClubsListClientProps {
  items: ClubListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  localFieldOptions: LocalFieldOption[];
  canCreate: boolean;
  canEdit: boolean;
  pendingCountsByClubId?: Record<number, number>;
}

function useSearchShortcutLabel(): string {
  const [shortcut, setShortcut] = useState("⌘K");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const isMac =
        typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      setShortcut(isMac ? "⌘K" : "Ctrl+K");
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return shortcut;
}

export function ClubsListClient({
  items,
  meta,
  localFieldOptions,
  canCreate,
  canEdit,
  pendingCountsByClubId = {},
}: ClubsListClientProps) {
  const { toPanelPath } = usePanelPath();

  const t = useTranslations("clubs.pages.v2");
  const tList = useTranslations("clubs.pages.list");
  const shortcut = useSearchShortcutLabel();
  const {
    searchInput,
    currentStatusFilter,
    currentLocalField,
    hasActiveFilters,
    updateParam,
    handleSearchInputChange,
    clearFilters,
  } = useClubsFilters();

  const safePage = Math.max(1, meta.page || 1);
  const safeLimit = Math.max(1, meta.limit || 20);
  const safeTotalPages = Math.max(1, meta.totalPages || 1);

  const activeOnPage = items.filter((club) => club.active !== false).length;
  const pendingTotal = items.reduce((sum, club) => {
    const clubId = getClubListId(club);
    return sum + (clubId ? pendingCountsByClubId[clubId] ?? 0 : 0);
  }, 0);

  return (
    <Card>
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="text-xl leading-none">{tList("title")}</CardTitle>
        <CardDescription className="max-w-prose leading-snug">
          {t("description")}
        </CardDescription>
        <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
          <InputGroup className="h-8 w-full md:w-72">
            <InputGroupAddon align="inline-start">
              <Search className="size-3.5" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="clubs-search"
              placeholder={t("searchPlaceholder")}
              value={searchInput}
              onChange={(event) => handleSearchInputChange(event.target.value)}
              aria-label={tList("colName")}
            />
            <InputGroupAddon align="inline-end">
              <Kbd className="h-4 text-[10px]">{shortcut}</Kbd>
            </InputGroupAddon>
          </InputGroup>
          {canCreate ? <ClubsCreateMenu /> : null}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={currentStatusFilter}
              onValueChange={(value) => updateParam("active", value)}
            >
              <SelectTrigger size="sm" className="w-[180px]" id="clubs-status">
                <span className="text-muted-foreground">{tList("colStatus")}:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  <SelectItem value="all">{t("statusAll")}</SelectItem>
                  <SelectItem value="true">{tList("statusActive")}</SelectItem>
                  <SelectItem value="false">{tList("statusInactive")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={currentLocalField}
              onValueChange={(value) => updateParam("localFieldId", value)}
            >
              <SelectTrigger size="sm" className="w-[220px]" id="clubs-local-field">
                <span className="text-muted-foreground">{tList("colLocalField")}:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  <SelectItem value="all">{t("localFieldAll")}</SelectItem>
                  {localFieldOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={clearFilters}
            >
              <X className="size-3.5" aria-hidden="true" />
              {tList("clearFilters")}
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <p className="text-sm text-muted-foreground tabular-nums">
            {tList("resultsSummary", {
              total: meta.total,
              active: activeOnPage,
              pending: pendingTotal,
            })}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="px-4 pb-2">
            <EmptyState
              icon={hasActiveFilters ? Search : Building2}
              title={hasActiveFilters ? t("emptyFilteredTitle") : tList("emptyTitle")}
              description={
                hasActiveFilters ? t("emptyFilteredDescription") : tList("emptyDescription")
              }
            >
              {canCreate && !hasActiveFilters && (
                <Button asChild size="sm">
                  <Link prefetch={false} href={toPanelPath("/dashboard/clubs/new")}>
                    <Plus className="size-4" />
                    {tList("emptyCreateButton")}
                  </Link>
                </Button>
              )}
            </EmptyState>
          </div>
        ) : (
          <>
            <ClubsTable
              embedded
              items={items}
              canCreate={canCreate}
              canEdit={canEdit}
              pendingCountsByClubId={pendingCountsByClubId}
              page={safePage}
              limit={safeLimit}
            />
            <Separator />
            <div className="px-4 pb-1">
              <DataTablePagination
                page={safePage}
                totalPages={safeTotalPages}
                total={meta.total}
                limit={safeLimit}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
