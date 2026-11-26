import Link from "next/link";
import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { UserAvatar } from "@/components/users/user-avatar";
import { UsersListRowActions } from "@/components/users/users-list-row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminUser } from "@/lib/api/admin-users";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { ErrorStateTableRow, type ErrorStateProps } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { RowActionsHead } from "@/components/shared/row-actions";
import { buildRoleTranslator, type RoleTranslator } from "@/lib/auth/role-labels";
import { getAdminUserDisplayName, getAdminUserSecondaryLabel } from "@/lib/admin-users/display";
import { toUserListRoleBadges, type UserListRoleBadge } from "@/lib/admin-users/list-role-badges";
import { getFormatDate } from "@/lib/format-locale";

type UsersTranslations = Awaited<ReturnType<typeof getTranslations<"users">>>;
type ListTranslations = Awaited<ReturnType<typeof getTranslations<"people.users.list">>>;

export type UsersTableError = Pick<ErrorStateProps, "kind" | "detail">;

interface UsersTableProps {
  users: AdminUser[];
  showAdministrativeCompletion?: boolean;
  /** A failed load replaces the rows, inside the same frame (never an empty table). */
  error?: UsersTableError | null;
}

function ActiveMark({ user, t }: { user: AdminUser; t: UsersTranslations }) {
  const value = user.active !== false ? "active" : "inactive";
  return (
    <ExceptionStatus
      value={value}
      normal={["active"]}
      labels={{ active: t("list.status.active"), inactive: t("list.status.inactive") }}
      intents={{ inactive: "neutral" }}
    />
  );
}

function PostRegistrationMark({ user, t }: { user: AdminUser; t: UsersTranslations }) {
  const value = user.post_registration?.complete ? "complete" : "pending";
  return (
    <ExceptionStatus
      value={value}
      normal={["complete"]}
      labels={{ complete: t("list.postReg.completeDesktop"), pending: t("list.postReg.pending") }}
      intents={{ pending: "warning" }}
    />
  );
}

export async function UsersTable({
  users,
  showAdministrativeCompletion = false,
  error = null,
}: UsersTableProps) {
  const t = await getTranslations("users");
  const tList = await getTranslations("people.users.list");
  const tRoles = await getTranslations("roles");
  const translateRole = buildRoleTranslator(tRoles);
  const formatDate = await getFormatDate();

  const columnCount = showAdministrativeCompletion ? 6 : 5;

  if (error) {
    return (
      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">{t("list.columns.user")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("list.columns.roles")}</TableHead>
              <TableHead className="hidden xl:table-cell">{t("list.columns.location")}</TableHead>
              {showAdministrativeCompletion ? (
                <TableHead className="hidden xl:table-cell">{t("list.columns.postRegistration")}</TableHead>
              ) : null}
              <TableHead className="hidden md:table-cell">{t("list.columns.registrationDate")}</TableHead>
              <RowActionsHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <ErrorStateTableRow
              colSpan={columnCount}
              kind={error.kind}
              detail={error.detail}
              icon={Users}
              retry
              {...(error.kind === "error"
                ? { title: tList("error.title"), description: tList("error.description") }
                : {})}
            />
          </TableBody>
        </Table>
      </DataTableShell>
    );
  }

  return (
    <>
      {/* Desktop: table */}
      <div className="hidden md:block">
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{t("list.columns.user")}</TableHead>
                <TableHead>{t("list.columns.roles")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("list.columns.location")}</TableHead>
                {showAdministrativeCompletion ? (
                  <TableHead className="hidden xl:table-cell">{t("list.columns.postRegistration")}</TableHead>
                ) : null}
                <TableHead>{t("list.columns.registrationDate")}</TableHead>
                <RowActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const roleBadges = toUserListRoleBadges(user, translateRole);
                const fullName = getAdminUserDisplayName(user, { deletedAccount: t("list.deletedAccount") });
                const secondaryLabel = getAdminUserSecondaryLabel(user, { anonymized: t("list.anonymizedAccount") });

                return (
                  <TableRow key={user.user_id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <UserAvatar src={user.user_image} name={fullName} email={secondaryLabel} size={32} />
                        <div className="min-w-0 max-w-[240px]">
                          <div className="flex items-center gap-2">
                            <Link
                              prefetch={false}
                              href={`/dashboard/users/${user.user_id}`}
                              className="block truncate text-sm font-medium hover:underline"
                            >
                              {fullName}
                            </Link>
                            <ActiveMark user={user} t={t} />
                          </div>
                          <p className="truncate text-xs text-muted-foreground" title={secondaryLabel}>
                            {secondaryLabel}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[280px] whitespace-normal">
                      <span className="text-sm text-muted-foreground">
                        {roleBadgesText(roleBadges, t)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] xl:table-cell">
                      <LocationCell user={user} />
                    </TableCell>
                    {showAdministrativeCompletion ? (
                      <TableCell className="hidden xl:table-cell">
                        <PostRegistrationMark user={user} t={t} />
                      </TableCell>
                    ) : null}
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {user.created_at ? formatDate(user.created_at) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowMenu user={user} name={fullName} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>

      {/* Mobile: two-line rows */}
      <ul className="md:hidden" aria-label={t("list.ariaLabel")}>
        {users.map((user) => (
          <li key={user.user_id}>
            <MobileRow
              user={user}
              showAdministrativeCompletion={showAdministrativeCompletion}
              t={t}
              tList={tList}
              translateRole={translateRole}
              date={user.created_at ? formatDate(user.created_at) : "—"}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function RowMenu({ user, name }: { user: AdminUser; name: string }) {
  return (
    <UsersListRowActions
      userId={user.user_id}
      name={name}
      active={user.active !== false}
      isDeleted={user.is_deleted === true}
      postRegistrationComplete={
        typeof user.post_registration?.complete === "boolean" ? user.post_registration.complete : null
      }
    />
  );
}

function LocationCell({ user }: { user: AdminUser }) {
  const union = user.union?.name;
  const localField = user.local_field?.name;
  if (!union && !localField) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="min-w-0">
      <p className="truncate text-xs">{union ?? "—"}</p>
      {localField && <p className="truncate text-xs text-muted-foreground">{localField}</p>}
    </div>
  );
}

function MobileRow({
  user,
  showAdministrativeCompletion,
  t,
  tList,
  translateRole,
  date,
}: {
  user: AdminUser;
  showAdministrativeCompletion: boolean;
  t: UsersTranslations;
  tList: ListTranslations;
  translateRole: RoleTranslator;
  date: string;
}) {
  const roleBadges = toUserListRoleBadges(user, translateRole);
  const fullName = getAdminUserDisplayName(user, { deletedAccount: t("list.deletedAccount") });
  const role = roleBadgesText(roleBadges, t);
  const location = [user.union?.name, user.local_field?.name].filter(Boolean).join(" · ");

  return (
    <div className="flex items-center gap-2 border-b py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            prefetch={false}
            href={`/dashboard/users/${user.user_id}`}
            className="truncate text-sm font-medium hover:underline"
          >
            {fullName}
          </Link>
          <ActiveMark user={user} t={t} />
          {showAdministrativeCompletion ? <PostRegistrationMark user={user} t={t} /> : null}
        </div>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
          <span>{role}</span>
          {location ? <span>{location}</span> : null}
          <span aria-label={tList("registeredOn", { date })}>{date}</span>
        </p>
      </div>
      <RowMenu user={user} name={fullName} />
    </div>
  );
}

/** "Director, Miembro (pendiente)"; a pending role awaits approval in its club. */
function roleBadgesText(badges: UserListRoleBadge[], t: UsersTranslations): string {
  if (badges.length === 0) {
    return t("list.noRole");
  }
  return badges
    .map((badge) => (badge.pending ? t("list.pendingRole", { role: badge.label }) : badge.label))
    .join(", ");
}
