"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Pencil,
  Power,
  Search,
  AlertTriangle,
  UserX,
  ShieldCheck,
  Users,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRoleLabel } from "@/lib/auth/role-labels";
import { getPermissionLabel } from "@/lib/auth/permissions";
import { groupByScreen } from "@/lib/auth/screen-catalog";
import {
  getScreenGroupTitle,
  type NavTranslator,
} from "@/lib/auth/screen-catalog/screen-title";
import { RowActions, RowActionsHead, type RowAction } from "@/components/shared/row-actions";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTableShell } from "@/components/shared/data-table-shell";
import {
  SortableHeader,
  type SortDirection,
} from "@/components/shared/sortable-header";
import { deactivateRoleAction } from "@/lib/rbac/actions";
import type { Role } from "@/lib/rbac/types";

// ─── Alert component — may not exist yet, using inline div fallback ──────────
// The admin uses a generic Alert from shadcn. We check for it and fallback gracefully.
function ReadOnlyAlert() {
  const t = useTranslations("rbac.rolesTable");
  return (
    <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 p-4 text-sm">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-info" />
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">{t("readOnlyTitle")}</span>{" "}
        {t("readOnlyHint")}
      </p>
    </div>
  );
}

// ─── Permissions popover ─────────────────────────────────────────────────────
function PermissionsPopover({ role }: { role: Role }) {
  const t = useTranslations("rbac");
  const tNav = useTranslations("nav.items") as unknown as NavTranslator;
  const permCount = role.role_permissions?.length ?? 0;

  const otherLabel = t("permissionPicker.otherGroup");
  const grouped = useMemo(() => {
    const names = (role.role_permissions ?? []).map(
      (rp) => rp.permissions?.permission_name ?? rp.permission_id,
    );
    return groupByScreen(names, (name) => name).map((group) => ({
      id: group.screenId,
      title: getScreenGroupTitle(tNav, group, otherLabel),
      permissions: group.items,
    }));
  }, [role.role_permissions, tNav, otherLabel]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-pointer focus-visible:outline-none"
          aria-label={t("rolesTable.permissionsViewAria", { count: permCount, name: role.role_name })}
        >
          <Badge variant="secondary" className="tabular-nums">
            {t("rolesTable.permissionsCount", { count: permCount })}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        {permCount === 0 ? (
          <p className="text-sm text-muted-foreground">Sin permisos asignados.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("rolesTable.permissionsAssigned", { count: permCount })}
            </p>
            {grouped.map(({ id, title, permissions: perms }) => (
              <div key={id} className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  {title}
                </p>
                <div className="flex flex-wrap gap-1">
                  {perms.map((p) => (
                    <span
                      key={p}
                      title={p}
                      className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground"
                    >
                      {getPermissionLabel(t, p)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Deactivate AlertDialog ──────────────────────────────────────────────────
interface DeactivateDialogProps {
  role: Role;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function parseUsersCount(errorMessage: string): number | null {
  // Backend message format: "Cannot deactivate role: N users are currently assigned..."
  const match = /(\d+)\s+user/i.exec(errorMessage);
  return match ? parseInt(match[1], 10) : null;
}

function DeactivateDialog({ role, open, onClose, onSuccess }: DeactivateDialogProps) {
  const t = useTranslations("rbac");
  const tTable = useTranslations("rbac.rolesTable");
  const translateRole = useRoleLabel();
  const [loading, setLoading] = useState(false);
  const [blockError, setBlockError] = useState<{ usersCount: number } | null>(null);

  const handleDeactivate = async () => {
    setLoading(true);
    setBlockError(null);
    try {
      const result = await deactivateRoleAction(role.role_id);
      if (result.error) {
        const count = parseUsersCount(result.error);
        if (count !== null) {
          setBlockError({ usersCount: count });
        } else {
          toast.error(result.error);
          onClose();
        }
      } else {
        toast.success(t("toasts.role_deactivated", { name: role.role_name }));
        onSuccess();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = blockError !== null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setBlockError(null);
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className={isBlocked ? "bg-warning/10" : "bg-destructive/10"}>
            {isBlocked ? (
              <UserX className="size-8 text-warning" />
            ) : (
              <AlertTriangle className="size-8 text-destructive" />
            )}
          </AlertDialogMedia>
          <AlertDialogTitle>
            {isBlocked
              ? tTable("dialogBlockedTitle", { name: role.role_name })
              : tTable("dialogConfirmTitle", { name: role.role_name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked ? (
              tTable.rich("dialogBlockedDescription", {
                count: blockError.usersCount,
                b: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              })
            ) : (
              tTable("dialogConfirmDescription")
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setBlockError(null); onClose(); }}>
            {isBlocked ? tTable("dialogClose") : tTable("dialogCancel")}
          </AlertDialogCancel>
          {!isBlocked ? (
            <AlertDialogAction
              variant="destructive-solid"
              loading={loading}
              onClick={(e) => {
                e.preventDefault();
                void handleDeactivate();
              }}
            >
              {loading ? tTable("dialogProcessing") : tTable("dialogDeactivate")}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main roles table ────────────────────────────────────────────────────────
type ActiveFilter = "true" | "false" | "all";
type SortField = "role_name" | "role_category" | "permissions" | "active";

interface RolesTableProps {
  roles: Role[];
  isSuperAdmin: boolean;
}

export function RolesTable({ roles, isSuperAdmin }: RolesTableProps) {
  const t = useTranslations("rbac");
  const tTable = useTranslations("rbac.rolesTable");
  const translateRole = useRoleLabel();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveFilter>("true");
  const [sortField, setSortField] = useState<SortField>("role_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [deactivateTarget, setDeactivateTarget] = useState<Role | null>(null);
  const router = useRouter();

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const filtered = useMemo(() => {
    const byStatus = roles.filter((r) => {
      if (activeTab === "true") return r.active !== false;
      if (activeTab === "false") return r.active === false;
      return true;
    });

    const bySearch = !search.trim()
      ? byStatus
      : byStatus.filter((r) => {
          const q = search.toLowerCase();
          return (
            r.role_name.toLowerCase().includes(q) ||
            (r.description?.toLowerCase().includes(q) ?? false)
          );
        });

    const sorted = [...bySearch].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "role_name":
          return a.role_name.localeCompare(b.role_name) * dir;
        case "role_category":
          return a.role_category.localeCompare(b.role_category) * dir;
        case "permissions": {
          const ap = a.role_permissions?.length ?? 0;
          const bp = b.role_permissions?.length ?? 0;
          return (ap - bp) * dir;
        }
        case "active": {
          const av = a.active === false ? 0 : 1;
          const bv = b.active === false ? 0 : 1;
          return (av - bv) * dir;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [roles, activeTab, search, sortField, sortDirection]);

  const isProtected = (role: Role) => role.role_name === "super-admin";

  // One accessible path for edit/deactivate in both layouts: the row menu.
  const roleActions = (role: Role): RowAction[] => {
    const protected_ = isProtected(role);
    return [
      {
        label: tTable("actionEdit"),
        icon: Pencil,
        href: `/dashboard/configuration/roles/${role.role_id}`,
        disabled: protected_,
      },
      {
        label: tTable("actionDeactivate"),
        icon: Power,
        destructive: true,
        onSelect: () => setDeactivateTarget(role),
        disabled: protected_,
        hidden: !protected_ && role.active === false,
      },
    ];
  };

  return (
    <div className="space-y-5">
      {!isSuperAdmin && <ReadOnlyAlert />}

      {/* Search + Tabs toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ActiveFilter)}
        >
          <TabsList variant="line">
            <TabsTrigger value="true">{tTable("tabActive")}</TabsTrigger>
            <TabsTrigger value="false">{tTable("tabInactive")}</TabsTrigger>
            <TabsTrigger value="all">{tTable("tabAll")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative max-w-xs w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tTable("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={search ? tTable("emptySearchTitle", { query: search }) : tTable("emptyTitle")}
          description={
            search
              ? tTable("emptySearchDescription")
              : activeTab === "false"
                ? tTable("emptyInactiveDescription")
                : tTable("emptyDescription")
          }
        />
      ) : (
        <>
          {/* Desktop: full table */}
          <div className="hidden md:block">
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="h-9 px-3"
                      aria-sort={
                        sortField === "role_name"
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <SortableHeader
                        field="role_name"
                        activeField={sortField}
                        direction={sortDirection}
                        onSort={handleSort}
                      >
                        {tTable("colName")}
                      </SortableHeader>
                    </TableHead>
                    <TableHead
                      className="h-9 px-3"
                      aria-sort={
                        sortField === "role_category"
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <SortableHeader
                        field="role_category"
                        activeField={sortField}
                        direction={sortDirection}
                        onSort={handleSort}
                      >
                        {tTable("colCategory")}
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground hidden md:table-cell">
                      {tTable("colDescription")}
                    </TableHead>
                    <TableHead
                      className="h-9 px-3"
                      aria-sort={
                        sortField === "permissions"
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <SortableHeader
                        field="permissions"
                        activeField={sortField}
                        direction={sortDirection}
                        onSort={handleSort}
                      >
                        {tTable("colPermissions")}
                      </SortableHeader>
                    </TableHead>
                    <TableHead
                      className="h-9 px-3"
                      aria-sort={
                        sortField === "active"
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <SortableHeader
                        field="active"
                        activeField={sortField}
                        direction={sortDirection}
                        onSort={handleSort}
                      >
                        {tTable("colStatus")}
                      </SortableHeader>
                    </TableHead>
                    {isSuperAdmin && (
                      <RowActionsHead className="h-9 px-3" />
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((role) => {
                    const protected_ = isProtected(role);
                    return (
                      <TableRow
                        key={role.role_id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        {/* role_name — mono, lock icon for super-admin */}
                        <TableCell className="px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            {protected_ && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>{tTable("protectedTooltip")}</TooltipContent>
                              </Tooltip>
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{translateRole(role.role_name)}</span>
                              <span className="font-mono text-xs text-muted-foreground">{role.role_name}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* role_category badge */}
                        <TableCell className="px-3 py-2.5 align-middle">
                          <Badge variant={role.role_category === "GLOBAL" ? "secondary" : "outline"}>
                            {role.role_category}
                          </Badge>
                        </TableCell>

                        {/* description — truncated with tooltip */}
                        <TableCell className="px-3 py-2.5 align-middle hidden md:table-cell max-w-[260px]">
                          {role.description ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate text-sm text-muted-foreground cursor-default">
                                  {role.description}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">{role.description}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* permissions count with popover */}
                        <TableCell className="px-3 py-2.5 align-middle">
                          <PermissionsPopover role={role} />
                        </TableCell>

                        {/* active status */}
                        <TableCell className="px-3 py-2.5 align-middle">
                          <StatusBadge intent={flagStatusIntent(role.active !== false)} label={role.active !== false ? tTable("statusActive") : tTable("statusInactive")} />
                        </TableCell>

                        {/* actions — super-admin only */}
                        {isSuperAdmin && (
                          <TableCell className="px-3 py-2.5 align-middle">
                            <RowActions
                              label={translateRole(role.role_name)}
                              actions={roleActions(role)}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableShell>
          </div>

          {/* Mobile: descriptive cards */}
          <ul className="space-y-3 md:hidden" aria-label={tTable("listAria")}>
            {filtered.map((role) => {
              const protected_ = isProtected(role);
              const permCount = role.role_permissions?.length ?? 0;

              return (
                <li key={role.role_id}>
                  <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        {protected_ ? (
                          <Lock className="size-5 text-primary" aria-hidden="true" />
                        ) : (
                          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{translateRole(role.role_name)}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{role.role_name}</p>
                        {role.description && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                      </div>
                      {!protected_ && isSuperAdmin && (
                        <Link prefetch={false}
                          href={`/dashboard/configuration/roles/${role.role_id}`}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={t("rolesTable.editRoleAriaLabel", {
                            name: role.role_name,
                          })}
                        >
                          <ChevronRight className="size-4" aria-hidden="true" />
                        </Link>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <StatusBadge intent={flagStatusIntent(role.active !== false)} label={role.active !== false ? tTable("statusActive") : tTable("statusInactive")} size="sm" />
                      <Badge variant={role.role_category === "GLOBAL" ? "secondary" : "outline"} className="text-xs">
                        {role.role_category}
                      </Badge>
                      {protected_ && (
                        <Badge variant="outline" className="text-xs">
                          {tTable("protectedBadge")}
                        </Badge>
                      )}
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div>
                        <dt className="text-muted-foreground">{tTable("colPermissions")}</dt>
                        <dd>{permCount}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{tTable("colCategory")}</dt>
                        <dd>{role.role_category}</dd>
                      </div>
                    </dl>

                    {isSuperAdmin && !protected_ && role.active !== false && (
                      <div className="mt-3 flex justify-end border-t border-border/40 pt-3">
                        <RowActions
                          label={translateRole(role.role_name)}
                          actions={roleActions(role)}
                        />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Footer count */}
      <p className="text-sm text-muted-foreground">
        {tTable.rich("footerCount", {
          shown: filtered.length,
          total: roles.length,
          b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
        })}
      </p>

      {/* Deactivate AlertDialog */}
      {deactivateTarget && (
        <DeactivateDialog
          role={deactivateTarget}
          open={!!deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
