"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { AdminMomPage, AdminMomItem } from "@/lib/api/member-of-month";
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";
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
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MemberOfMonthSupervisionClient({
  initialData,
  clubTypes,
  localFields,
  searchParams,
}: MemberOfMonthSupervisionClientProps) {
  const t = useTranslations("member_of_month.supervision");
  const router = useRouter();
  const formatDate = useFormatDate();
  const formatNumber = useFormatNumber();

  const currentPage = Number(searchParams.page ?? "1");
  const { total, limit, items } = initialData;
  const totalPages = Math.ceil(total / limit);

  const [dialogTarget, setDialogTarget] = useState<DialogTarget | null>(null);

  // ─── URL builder ──────────────────────────────────────────────────────────

  function buildUrl(overrides: Record<string, string | undefined>) {
    const next = { ...searchParams, ...overrides };
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Tipo de club */}
        <Select
          value={searchParams.club_type_id ?? "all"}
          onValueChange={(v) => handleFilter("club_type_id", v)}
        >
          <SelectTrigger className="w-44">
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

        {/* Campo local */}
        <Select
          value={searchParams.local_field_id ?? "all"}
          onValueChange={(v) => handleFilter("local_field_id", v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filterLocalFieldPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterLocalFieldAll")}</SelectItem>
            {localFields.map((lf) => (
              <SelectItem key={lf.local_field_id} value={String(lf.local_field_id)}>
                {lf.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Año */}
        <Select
          value={searchParams.year ?? String(new Date().getFullYear())}
          onValueChange={(v) => handleFilter("year", v)}
        >
          <SelectTrigger className="w-28">
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

        {/* Mes */}
        <Select
          value={searchParams.month ?? "all"}
          onValueChange={(v) => handleFilter("month", v)}
        >
          <SelectTrigger className="w-36">
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

        {/* Notificado */}
        <Select
          value={searchParams.notified ?? "all"}
          onValueChange={(v) => handleFilter("notified", v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filterNotifiedPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterNotifiedAll")}</SelectItem>
            <SelectItem value="true">{t("filterNotifiedTrue")}</SelectItem>
            <SelectItem value="false">{t("filterNotifiedFalse")}</SelectItem>
          </SelectContent>
        </Select>
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
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tableColMember")}</TableHead>
                <TableHead>{t("tableColSection")}</TableHead>
                <TableHead>{t("tableColClubType")}</TableHead>
                <TableHead>{t("tableColClub")}</TableHead>
                <TableHead>{t("tableColLocalField")}</TableHead>
                <TableHead>{t("tableColPeriod")}</TableHead>
                <TableHead className="text-right">{t("tableColPoints")}</TableHead>
                <TableHead>{t("tableColNotified")}</TableHead>
                <TableHead className="text-right">{t("tableColActions")}</TableHead>
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
                  <TableCell>{item.club_type ?? "—"}</TableCell>
                  <TableCell>{item.club_name ?? "—"}</TableCell>
                  <TableCell>{item.local_field ?? "—"}</TableCell>
                  <TableCell className="capitalize">
                    {formatDate(new Date(item.year, item.month - 1, 1), { month: "long", year: "numeric" })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(item.total_points)}
                  </TableCell>
                  <TableCell>
                    <NotifiedBadge notified={item.notified} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={item.club_id === null}
                        onClick={() => {
                          if (item.club_id === null) return;
                          setDialogTarget({
                            clubId: item.club_id,
                            sectionId: item.club_section_id,
                            sectionName: item.section_name ?? "sección",
                          });
                        }}
                      >
                        {t("reevaluateButton")}
                      </Button>
                    </div>
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
          onSuccess={() => {
            setDialogTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
