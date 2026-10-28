"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCw, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { EvaluateMemberOfMonthDialog } from "@/components/member-of-month/evaluate-dialog";
import { MONTH_NAMES } from "@/lib/constants";
import { capitalizeFirst } from "@/lib/utils";
import type { AdminTerritoryScope } from "@/lib/auth/territory-scope";
import type { AdminMomPage, AdminMomItem } from "@/lib/api/member-of-month";
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";
import { useAuth } from "@/lib/auth/auth-context";
import { canEvaluateMemberOfMonth } from "@/lib/member-of-month/evaluate-access";
import { useFormatDate, useFormatNumber } from "@/lib/format-locale";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function NotifiedBadge({ notified }: { notified: boolean }) {
  const t = useTranslations("member_of_month.supervision");
  if (notified) {
    return <Badge variant="success">{t("badgeNotified")}</Badge>;
  }
  return <Badge variant="secondary">{t("badgePending")}</Badge>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemberOfMonthSupervisionClientProps {
  initialData: AdminMomPage;
  clubTypes: ClubType[];
  localFields: LocalField[];
  territoryScope: AdminTerritoryScope;
  searchParams: {
    club_type_id?: string;
    local_field_id?: string;
    club_id?: string;
    section_id?: string;
    year?: string;
    month?: string;
    notified?: string;
    page?: string;
  };
}

// ─── Evaluate action state ────────────────────────────────────────────────────

type DialogTarget = {
  clubId: number;
  sectionId: number;
  sectionName: string;
  month: number;
  year: number;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MemberOfMonthSupervisionClient({
  initialData,
  clubTypes,
  localFields,
  territoryScope,
  searchParams,
}: MemberOfMonthSupervisionClientProps) {
  const t = useTranslations("member_of_month.supervision");
  const router = useRouter();
  const { user } = useAuth();
  const formatDate = useFormatDate();
  const formatNumber = useFormatNumber();

  const currentPage = Number(searchParams.page ?? "1");
  const { total, limit, items } = initialData;
  const totalPages = Math.ceil(total / limit);

  const [dialogTarget, setDialogTarget] = useState<DialogTarget | null>(null);
  const isLocalFieldLocked = territoryScope.level === "local_field";
  const effectiveSearchParams = isLocalFieldLocked
    ? {
        ...searchParams,
        local_field_id: String(territoryScope.localFieldId),
      }
    : searchParams;

  // ─── URL builder ──────────────────────────────────────────────────────────

  function buildUrl(overrides: Record<string, string | undefined>) {
    const next = { ...effectiveSearchParams, ...overrides };
    const qs = new URLSearchParams();
    for (const [key, val] of Object.entries(next)) {
      if (val !== undefined && val !== "" && val !== "all") {
        qs.set(key, val);
      }
    }
    const queryString = qs.toString();
    return `/dashboard/member-of-month${queryString ? `?${queryString}` : ""}`;
  }

  function handleFilter(key: string, value: string) {
    router.push(buildUrl({ [key]: value === "all" ? undefined : value, page: "1" }));
  }

  function handlePage(newPage: number) {
    router.push(buildUrl({ page: String(newPage) }));
  }

  const monthOptions = Object.entries(MONTH_NAMES).map(([value, label]) => ({
    value,
    label,
  }));
  const selectedLocalFieldId =
    searchParams.local_field_id ??
    (isLocalFieldLocked ? String(territoryScope.localFieldId) : "all");

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Tipo de club */}
        <div className="min-w-40 flex-1 basis-40 space-y-1.5">
          <Label htmlFor="mom-filter-club-type">{t("filterClubTypePlaceholder")}</Label>
          <Select
            value={effectiveSearchParams.club_type_id ?? "all"}
            onValueChange={(v) => handleFilter("club_type_id", v)}
          >
            <SelectTrigger id="mom-filter-club-type" className="w-full">
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
        </div>

        {/* Campo local */}
        <div className="min-w-48 flex-[1.5] basis-56 space-y-1.5">
          <Label htmlFor="mom-filter-local-field">{t("filterLocalFieldPlaceholder")}</Label>
          <Select
            value={selectedLocalFieldId}
            onValueChange={(v) => handleFilter("local_field_id", v)}
            disabled={isLocalFieldLocked}
          >
            <SelectTrigger id="mom-filter-local-field" className="w-full">
              <SelectValue placeholder={t("filterLocalFieldPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {!isLocalFieldLocked && (
                <SelectItem value="all">{t("filterLocalFieldAll")}</SelectItem>
              )}
              {localFields.map((lf) => (
                <SelectItem key={lf.local_field_id} value={String(lf.local_field_id)}>
                  {lf.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Año */}
        <div className="min-w-28 flex-none basis-32 space-y-1.5">
          <Label htmlFor="mom-filter-year">{t("filterYearPlaceholder")}</Label>
          <Select
            value={effectiveSearchParams.year ?? String(new Date().getFullYear())}
            onValueChange={(v) => handleFilter("year", v)}
          >
            <SelectTrigger id="mom-filter-year" className="w-full">
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
        </div>

        {/* Mes */}
        <div className="min-w-40 flex-1 basis-44 space-y-1.5">
          <Label htmlFor="mom-filter-month">{t("filterMonthPlaceholder")}</Label>
          <Select
            value={effectiveSearchParams.month ?? "all"}
            onValueChange={(v) => handleFilter("month", v)}
          >
            <SelectTrigger id="mom-filter-month" className="w-full">
              <SelectValue placeholder={t("filterMonthPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterMonthAll")}</SelectItem>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notificado */}
        <div className="min-w-40 flex-1 basis-44 space-y-1.5">
          <Label htmlFor="mom-filter-notified">{t("filterNotifiedPlaceholder")}</Label>
          <Select
            value={effectiveSearchParams.notified ?? "all"}
            onValueChange={(v) => handleFilter("notified", v)}
          >
            <SelectTrigger id="mom-filter-notified" className="w-full">
              <SelectValue placeholder={t("filterNotifiedPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterNotifiedAll")}</SelectItem>
              <SelectItem value="true">{t("filterNotifiedTrue")}</SelectItem>
              <SelectItem value="false">{t("filterNotifiedFalse")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Trophy className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            {t("emptyTitle")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {t("emptyHint")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-transparent bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tableColMember")}</TableHead>
                <TableHead>{t("tableColSection")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("tableColClubType")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("tableColClub")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("tableColLocalField")}</TableHead>
                <TableHead>{t("tableColPeriod")}</TableHead>
                <TableHead className="text-right">{t("tableColPoints")}</TableHead>
                <TableHead>{t("tableColNotified")}</TableHead>
                <RowActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: AdminMomItem) => (
                <TableRow key={item.member_of_month_id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm">
                        {item.user_image && (
                          <AvatarImage
                            src={item.user_image}
                            alt={item.user_name ?? ""}
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {getInitials(item.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {item.user_name ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{item.section_name ?? "—"}</TableCell>
                  <TableCell className="hidden xl:table-cell">{item.club_type ?? "—"}</TableCell>
                  <TableCell className="hidden xl:table-cell">{item.club_name ?? "—"}</TableCell>
                  <TableCell className="hidden xl:table-cell">{item.local_field ?? "—"}</TableCell>
                  <TableCell>
                    {capitalizeFirst(
                      formatDate(new Date(item.year, item.month - 1, 1), {
                        month: "long",
                        year: "numeric",
                      }),
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(item.total_points)}
                  </TableCell>
                  <TableCell>
                    <NotifiedBadge notified={item.notified} />
                  </TableCell>
                  <TableCell>
                    <RowActions
                      label={item.user_name ?? "—"}
                      actions={[
                        {
                          label: t("reevaluateButton"),
                          icon: RefreshCw,
                          disabled: item.club_id === null,
                          // Backend: mom:evaluate + active director role in THIS section.
                          hidden: !canEvaluateMemberOfMonth(user, item.club_section_id),
                          onSelect: () => {
                            if (item.club_id === null) return;
                            setDialogTarget({
                              clubId: item.club_id,
                              sectionId: item.club_section_id,
                              sectionName: item.section_name ?? "sección",
                              month: item.month,
                              year: item.year,
                            });
                          },
                        },
                      ]}
                    />
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

      {/* Re-evaluate dialog */}
      {dialogTarget !== null && (
        <EvaluateMemberOfMonthDialog
          open={dialogTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDialogTarget(null);
          }}
          clubId={dialogTarget.clubId}
          sectionId={dialogTarget.sectionId}
          sectionName={dialogTarget.sectionName}
          defaultMonth={dialogTarget.month}
          defaultYear={dialogTarget.year}
          onSuccess={() => {
            setDialogTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
