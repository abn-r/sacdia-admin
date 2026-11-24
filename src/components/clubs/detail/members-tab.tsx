"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "@/components/users/user-avatar";
import { useRoleLabel } from "@/lib/auth/role-labels";
import {
  DEFAULT_MEMBER_FILTERS,
  buildMemberRows,
  filterMemberRows,
  hasActiveMemberFilters,
  memberClassOptions,
  memberRoleOptions,
  paginateRows,
  type ClubMemberFilters,
  type ClubMemberRow,
} from "@/lib/clubs/detail-members";
import type { ClubDetailPayload } from "@/lib/clubs/types";

const PAGE_SIZES = [20, 50, 100];

interface MembersTabProps {
  data: ClubDetailPayload;
  /** "2026": year of the class column. */
  classYearLabel: string | null;
}

function FilterField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-[200px]">
      <Label htmlFor={id} className="text-muted-foreground text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function MembersTab({ data, classYearLabel }: MembersTabProps) {
  const t = useTranslations("people.clubDetail.members");
  const translateRole = useRoleLabel();
  const [filters, setFilters] = useState<ClubMemberFilters>(DEFAULT_MEMBER_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0] ?? 20);

  const rows = useMemo(() => buildMemberRows(data.sectionMemberGroups), [data.sectionMemberGroups]);
  const roleOptions = useMemo(() => memberRoleOptions(rows), [rows]);
  const classOptions = useMemo(() => memberClassOptions(rows), [rows]);
  const filtered = useMemo(() => filterMemberRows(rows, filters), [rows, filters]);
  const pageData = paginateRows(filtered, page, limit);
  const filtering = hasActiveMemberFilters(filters);
  const classHeading = classYearLabel ? t("classYear", { year: classYearLabel }) : t("classColumn");

  function update(patch: Partial<ClubMemberFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }

  function roleCell(row: ClubMemberRow) {
    if (row.roles.length === 0) {
      return <span className="text-muted-foreground">{t("plainMember")}</span>;
    }
    return <span className="font-medium">{row.roles.map((role) => translateRole(role)).join(", ")}</span>;
  }

  if (rows.length === 0) {
    return <EmptyState icon={Users} title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <FilterField id="club-members-search" label={t("search")}>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="club-members-search"
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
              placeholder={t("searchPlaceholder")}
              className="pl-8"
            />
          </div>
        </FilterField>
        <FilterField id="club-members-section" label={t("section")}>
          <Select value={filters.section} onValueChange={(section) => update({ section })}>
            <SelectTrigger id="club-members-section" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allSections")}</SelectItem>
              {data.sectionMemberGroups.map((group) => (
                <SelectItem key={group.sectionId} value={String(group.sectionId)}>
                  {group.sectionName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField id="club-members-role" label={t("role")}>
          <Select value={filters.role} onValueChange={(role) => update({ role })}>
            <SelectTrigger id="club-members-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allRoles")}</SelectItem>
              <SelectItem value="member">{t("onlyMembers")}</SelectItem>
              {roleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  {translateRole(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField id="club-members-class" label={classHeading}>
          <Select value={filters.className} onValueChange={(className) => update({ className })}>
            <SelectTrigger id="club-members-class" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allClasses")}</SelectItem>
              {classOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          variant="no-results"
          icon={Search}
          title={t("noResultsTitle")}
          description={t("noResultsDescription")}
        >
          {filtering ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters(DEFAULT_MEMBER_FILTERS);
                setPage(1);
              }}
            >
              {t("clearFilters")}
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          <DataTableShell className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("person")}</TableHead>
                  <TableHead>{t("section")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{classHeading}</TableHead>
                  <RowActionsHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.items.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar src={row.pictureUrl} name={row.name} size={32} />
                        <span className="truncate font-medium">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{row.sectionName}</TableCell>
                    <TableCell>{roleCell(row)}</TableCell>
                    <TableCell>
                      {row.className ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        label={row.name}
                        actions={[
                          {
                            label: t("viewProfile"),
                            href: `/dashboard/users/${row.userId}`,
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>

          <ul className="divide-y rounded-xl bg-card shadow-card md:hidden">
            {pageData.items.map((row) => (
              <li key={row.key} className="flex items-center gap-3 px-4 py-3">
                <UserAvatar src={row.pictureUrl} name={row.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.name}</p>
                  <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                    <span>{row.sectionName}</span>
                    {row.roles.length > 0 ? (
                      <span className="text-foreground">
                        {row.roles.map((role) => translateRole(role)).join(", ")}
                      </span>
                    ) : (
                      <span>{t("plainMember")}</span>
                    )}
                    {row.className ? <span>{row.className}</span> : null}
                  </p>
                </div>
                <RowActions
                  label={row.name}
                  actions={[{ label: t("viewProfile"), href: `/dashboard/users/${row.userId}` }]}
                />
              </li>
            ))}
          </ul>

          <DataTablePagination
            page={pageData.page}
            totalPages={pageData.totalPages}
            total={pageData.total}
            limit={limit}
            limitOptions={PAGE_SIZES}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
