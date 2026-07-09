"use client";

import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { DataTableShell } from "@/components/shared/data-table-shell";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";
import {
  getClubChurchName,
  getClubDistrictName,
  getClubListId,
  getClubLocalFieldName,
  type ClubListItem,
} from "@/lib/clubs/fetch-list";

interface ClubsTableProps {
  items: ClubListItem[];
  canEdit: boolean;
  canCreate: boolean;
  pendingCountsByClubId: Record<number, number>;
  page: number;
  limit: number;
  embedded?: boolean;
}

function ClubIdentity({
  club,
  pendingCount,
  tList,
}: {
  club: ClubListItem;
  pendingCount: number;
  tList: ReturnType<typeof useTranslations<"clubs.pages.list">>;
}) {
  const clubId = getClubListId(club);
  const localField = getClubLocalFieldName(club);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Building2 className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {clubId ? (
            <Link
              prefetch={false}
              href={`/dashboard/clubs/${clubId}`}
              className="truncate text-sm font-medium hover:text-primary hover:underline underline-offset-4"
            >
              {club.name ?? "—"}
            </Link>
          ) : (
            <span className="truncate text-sm font-medium">{club.name ?? "—"}</span>
          )}
          {pendingCount > 0 ? (
            <Badge variant="soft-warning" className="text-[10px]">
              {tList("pendingBadge", { count: pendingCount })}
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {localField ?? club.local_field_id ?? "—"}
        </p>
      </div>
    </div>
  );
}

function ClubRowActions({
  clubId,
  canEdit,
  canCreate,
  t,
}: {
  clubId: number | null;
  canEdit: boolean;
  canCreate: boolean;
  t: ReturnType<typeof useTranslations<"clubs.pages.v2">>;
}) {
  if (!clubId || (!canEdit && !canCreate)) return null;

  return (
    <>
      <div className="hidden items-center justify-end gap-1 md:flex">
        <Button variant="ghost" size="icon" className="size-8" asChild title={t("actionView")}>
          <Link prefetch={false} href={`/dashboard/clubs/${clubId}`}>
            <Eye className="size-3.5" />
          </Link>
        </Button>
        {canEdit ? (
          <Button variant="ghost" size="icon" className="size-8" asChild title={t("actionEdit")}>
            <Link prefetch={false} href={`/dashboard/clubs/${clubId}?tab=edit`}>
              <Pencil className="size-3.5" />
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link prefetch={false} href={`/dashboard/clubs/${clubId}`}>
                <Eye className="size-4" />
                {t("actionView")}
              </Link>
            </DropdownMenuItem>
            {canEdit ? (
              <DropdownMenuItem asChild>
                <Link prefetch={false} href={`/dashboard/clubs/${clubId}?tab=edit`}>
                  <Pencil className="size-4" />
                  {t("actionEdit")}
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

function ClubMobileCard({
  club,
  clubId,
  pendingCount,
  activeSections,
  sectionsCount,
  t,
  tList,
}: {
  club: ClubListItem;
  clubId: number | null;
  pendingCount: number;
  activeSections: number;
  sectionsCount: number;
  t: ReturnType<typeof useTranslations<"clubs.pages.v2">>;
  tList: ReturnType<typeof useTranslations<"clubs.pages.list">>;
}) {
  if (!clubId) return null;

  const district = getClubDistrictName(club);
  const church = getClubChurchName(club);

  return (
    <Link
      prefetch={false}
      href={`/dashboard/clubs/${clubId}`}
      className="block rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{club.name ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {getClubLocalFieldName(club) ?? "—"}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge
              variant={club.active !== false ? "soft-success" : "outline"}
              className="text-xs"
            >
              {club.active !== false ? tList("statusActive") : tList("statusInactive")}
            </Badge>
            <Badge variant="secondary" className="text-xs tabular-nums">
              {t("colSections")}: {activeSections}/{sectionsCount || "—"}
            </Badge>
            {pendingCount > 0 ? (
              <Badge variant="soft-warning" className="text-xs">
                {tList("pendingBadge", { count: pendingCount })}
              </Badge>
            ) : null}
          </div>
          {(district || church) && (
            <dl className="mt-3 grid grid-cols-1 gap-1 text-xs">
              {district ? (
                <div>
                  <dt className="text-muted-foreground">{tList("colDistrict")}</dt>
                  <dd className="truncate">{district}</dd>
                </div>
              ) : null}
              {church ? (
                <div>
                  <dt className="text-muted-foreground">{tList("colChurch")}</dt>
                  <dd className="truncate">{church}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ClubsTable({
  items,
  canEdit,
  canCreate,
  pendingCountsByClubId,
  page,
  limit,
  embedded = false,
}: ClubsTableProps) {
  const t = useTranslations("clubs.pages.v2");
  const tList = useTranslations("clubs.pages.list");
  const safePage = Math.max(1, page || 1);
  const safeLimit = Math.max(1, limit || 20);
  const showActions = canEdit || canCreate;

  const tableMarkup = (
    <Table className="**:data-[slot=table-cell]:px-4 **:data-[slot=table-head]:px-4">
      <TableHeader className="[&_tr]:border-t">
        <TableRow>
          <TableHead className="py-4 font-normal">{tList("colName")}</TableHead>
          <TableHead className="py-4 font-normal">{tList("colDistrict")}</TableHead>
          <TableHead className="py-4 font-normal">{tList("colChurch")}</TableHead>
          <TableHead className="py-4 font-normal">{t("colSections")}</TableHead>
          <TableHead className="py-4 font-normal">{tList("colStatus")}</TableHead>
          {showActions ? (
            <TableHead className="sticky right-0 z-20 w-[100px] border-l bg-card py-4 pr-4 font-normal">
              {tList("colActions")}
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((club, index) => {
          const clubId = getClubListId(club);
          const rowKey = clubId
            ? `club-${clubId}`
            : `club-idx-${(safePage - 1) * safeLimit + index}`;
          const sections = Array.isArray(club.club_sections) ? club.club_sections : [];
          const activeSections = sections.filter(
            (section) => section.active !== false,
          ).length;
          const pendingCount = clubId ? pendingCountsByClubId[clubId] ?? 0 : 0;

          return (
            <TableRow
              key={rowKey}
              className={`border-border/60 hover:bg-muted/40 ${embedded ? "" : STAGGER_CLASSES}`}
              style={embedded ? undefined : getStaggerStyle(index)}
            >
              <TableCell className="max-w-[280px] px-3 py-4 align-middle">
                <ClubIdentity club={club} pendingCount={pendingCount} tList={tList} />
              </TableCell>
              <TableCell className="max-w-[180px] px-3 py-4 align-middle text-sm text-muted-foreground">
                <span className="block truncate">
                  {getClubDistrictName(club) ?? club.district_id ?? "—"}
                </span>
              </TableCell>
              <TableCell className="max-w-[180px] px-3 py-4 align-middle text-sm text-muted-foreground">
                <span className="block truncate">
                  {getClubChurchName(club) ?? club.church_id ?? "—"}
                </span>
              </TableCell>
              <TableCell className="px-3 py-4 align-middle font-mono text-sm tabular-nums">
                {activeSections}/{sections.length || "—"}
              </TableCell>
              <TableCell className="px-3 py-4 align-middle">
                <Badge
                  variant={club.active !== false ? "soft-success" : "outline"}
                  className="text-xs"
                >
                  {club.active !== false
                    ? tList("statusActive")
                    : tList("statusInactive")}
                </Badge>
              </TableCell>
              {showActions ? (
                <TableCell className="sticky right-0 z-10 border-l bg-card px-3 py-4 pr-4 align-middle">
                  <ClubRowActions
                    clubId={clubId}
                    canEdit={canEdit}
                    canCreate={canCreate}
                    t={t}
                  />
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <>
      <div className="hidden md:block">
        {embedded ? tableMarkup : <DataTableShell>{tableMarkup}</DataTableShell>}
      </div>

      <div className="space-y-3 md:hidden" aria-label={tList("mobileListLabel")}>
        {items.map((club, index) => {
          const clubId = getClubListId(club);
          const sections = Array.isArray(club.club_sections) ? club.club_sections : [];
          const activeSections = sections.filter(
            (section) => section.active !== false,
          ).length;
          const pendingCount = clubId ? pendingCountsByClubId[clubId] ?? 0 : 0;
          const rowKey = clubId
            ? `club-mobile-${clubId}`
            : `club-mobile-idx-${(safePage - 1) * safeLimit + index}`;

          return (
            <div key={rowKey} className={STAGGER_CLASSES} style={getStaggerStyle(index)}>
              <ClubMobileCard
                club={club}
                clubId={clubId}
                pendingCount={pendingCount}
                activeSections={activeSections}
                sectionsCount={sections.length}
                t={t}
                tList={tList}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
