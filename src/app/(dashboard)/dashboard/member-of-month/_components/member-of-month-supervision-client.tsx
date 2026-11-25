"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { RefreshCw, Trophy } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { ScopePicker } from "@/components/shared/scope-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { evaluateMemberOfMonth, type AdminMomPage } from "@/lib/api/member-of-month";
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";
import { useAuth } from "@/lib/auth/auth-context";
import type { AdminTerritoryScope } from "@/lib/auth/territory-scope";
import { useFormatDate, useFormatNumber } from "@/lib/format-locale";
import { canEvaluateMemberOfMonth } from "@/lib/member-of-month/evaluate-access";
import { groupMemberOfMonth, memberInitials, momSectionLabel, type MomGroup } from "@/lib/progress/member-of-month";
import { capitalizeFirst } from "@/lib/utils";

/** A tie can list many winners: show a few faces and names, then the count. */
const MAX_TIE_AVATARS = 3;
const MAX_TIE_NAMES = 3;

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
    limit?: string;
  };
}

export function MemberOfMonthSupervisionClient({
  initialData,
  clubTypes,
  localFields,
  territoryScope,
  searchParams,
}: MemberOfMonthSupervisionClientProps) {
  const t = useTranslations("evaluation.progress.memberOfMonth");
  const router = useRouter();
  const format = useFormatter();
  const { user } = useAuth();
  const formatDate = useFormatDate();
  const formatNumber = useFormatNumber();
  const [redo, setRedo] = useState<MomGroup | null>(null);

  const { total, limit, items } = initialData;
  const groups = groupMemberOfMonth(items);
  const currentPage = Number(searchParams.page ?? "1");
  const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const isLocalFieldLocked = territoryScope.level === "local_field";
  const currentYear = new Date().getFullYear();
  const effective: Record<string, string | undefined> = isLocalFieldLocked
    ? { ...searchParams, local_field_id: String(territoryScope.localFieldId) }
    : { ...searchParams };
  const isFiltered = Boolean(
    searchParams.club_type_id || searchParams.month || searchParams.notified || (!isLocalFieldLocked && searchParams.local_field_id),
  );

  function go(overrides: Record<string, string | undefined>) {
    const next = { ...effective, ...overrides, page: undefined };
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value !== undefined && value !== "" && value !== "all") qs.set(key, value);
    }
    const query = qs.toString();
    router.push(`/dashboard/member-of-month${query ? `?${query}` : ""}`);
  }

  const monthLabel = (month: number, year: number, long = true) =>
    capitalizeFirst(formatDate(new Date(year, month - 1, 1), long ? { month: "long", year: "numeric" } : { month: "long" }));

  const selectedField = localFields.find((f) => String(f.local_field_id) === effective.local_field_id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        {!isLocalFieldLocked && (
          <ScopePicker
            allLabel={t("filters.allFields")}
            value={selectedField ? { id: String(selectedField.local_field_id), name: selectedField.name } : undefined}
            options={localFields.map((f) => ({ id: String(f.local_field_id), name: f.name }))}
            onChange={(id) => go({ local_field_id: id ?? undefined })}
          />
        )}

        <Select value={effective.club_type_id ?? "all"} onValueChange={(v) => go({ club_type_id: v })}>
          <SelectTrigger className="h-9 w-auto min-w-40" aria-label={t("filters.clubType")}>
            <SelectValue placeholder={t("filters.clubType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allClubTypes")}</SelectItem>
            {clubTypes.map((ct) => (
              <SelectItem key={ct.club_type_id} value={String(ct.club_type_id)}>
                {ct.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={effective.month ?? "all"} onValueChange={(v) => go({ month: v })}>
          <SelectTrigger className="h-9 w-auto min-w-36" aria-label={t("filters.month")}>
            <SelectValue placeholder={t("filters.month")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allMonths")}</SelectItem>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>
                {monthLabel(m, currentYear, false)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={effective.year ?? String(currentYear)} onValueChange={(v) => go({ year: v })}>
          <SelectTrigger className="h-9 w-auto min-w-28" aria-label={t("filters.year")}>
            <SelectValue placeholder={t("filters.year")} />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={effective.notified ?? "all"} onValueChange={(v) => go({ notified: v })}>
          <SelectTrigger className="h-9 w-auto min-w-40" aria-label={t("filters.notice")}>
            <SelectValue placeholder={t("filters.notice")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.noticeAny")}</SelectItem>
            <SelectItem value="false">{t("filters.noticePending")}</SelectItem>
            <SelectItem value="true">{t("filters.noticeSent")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Trophy}
          variant={isFiltered ? "no-results" : "default"}
          title={t("emptyTitle")}
          description={isFiltered ? t("emptyFilteredDescription") : t("emptyDescription")}
        >
          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => go({ club_type_id: undefined, month: undefined, notified: undefined, local_field_id: undefined })}
            >
              {t("clearFilters")}
            </Button>
          )}
        </EmptyState>
      ) : (
        <>
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("cols.section")}</TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("cols.winner")}</TableHead>
                  <TableHead className="h-9 px-3 text-right text-xs font-medium text-muted-foreground">{t("cols.points")}</TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("cols.notice")}</TableHead>
                  <RowActionsHead className="h-9 px-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => {
                  const label = momSectionLabel(group) || "—";
                  return (
                    <TableRow key={group.key}>
                      <TableCell className="px-3 py-2.5">
                        <span className="block font-medium">{label}</span>
                        <span className="block text-[13px] text-muted-foreground">
                          {monthLabel(group.month, group.year)}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 whitespace-normal">
                        <div className="flex items-center gap-2">
                          <div className="flex shrink-0 -space-x-2">
                            {group.winners.slice(0, MAX_TIE_AVATARS).map((w) => (
                              <Avatar key={w.member_of_month_id} size="sm" className="ring-2 ring-card">
                                {w.user_image && <AvatarImage src={w.user_image} alt="" />}
                                <AvatarFallback className="text-xs">{memberInitials(w.user_name)}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span>
                            {group.winners.length > MAX_TIE_NAMES
                              ? t("tieMany", {
                                  names: group.winners
                                    .slice(0, MAX_TIE_NAMES)
                                    .map((w) => w.user_name ?? "—")
                                    .join(", "),
                                  count: group.winners.length - MAX_TIE_NAMES,
                                })
                              : format.list(
                                  group.winners.map((w) => w.user_name ?? "—"),
                                  { type: "conjunction" },
                                )}
                            {group.winners.length > 1 && (
                              <span className="text-muted-foreground"> · {t("tie")}</span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right tabular-nums">
                        {formatNumber(group.totalPoints)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <ExceptionStatus
                          value={group.unnotified ? "pending" : "notified"}
                          normal={["notified"]}
                          labels={{ notified: t("noticeSent"), pending: t("noticePending") }}
                          intents={{ pending: "warning" }}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <RowActions
                          label={label}
                          actions={[
                            {
                              label: t("redo"),
                              icon: RefreshCw,
                              // Backend: mom:evaluate + active director role in THIS section.
                              hidden: group.clubId === null || !canEvaluateMemberOfMonth(user, group.clubSectionId),
                              onSelect: () => setRedo(group),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>
          <DataTablePagination page={currentPage} totalPages={totalPages} total={total} limit={limit} />
        </>
      )}

      <ConfirmDialog
        open={redo !== null}
        onOpenChange={(open) => {
          if (!open) setRedo(null);
        }}
        title={
          redo
            ? t("redoDialog.title", { month: monthLabel(redo.month, redo.year), section: momSectionLabel(redo) })
            : ""
        }
        description={
          redo
            ? t("redoDialog.description", {
                names: format.list(
                  redo.winners.map((w) => w.user_name ?? "—"),
                  { type: "conjunction" },
                ),
              })
            : ""
        }
        confirmLabel={t("redoDialog.confirm")}
        onConfirm={async () => {
          if (!redo || redo.clubId === null) return;
          try {
            await evaluateMemberOfMonth(redo.clubId, redo.clubSectionId, { month: redo.month, year: redo.year });
          } catch (err) {
            throw new Error(err instanceof Error && err.message ? err.message : t("redoDialog.failed"));
          }
          toast.success(t("redoDialog.done"));
          router.refresh();
        }}
      />
    </div>
  );
}
