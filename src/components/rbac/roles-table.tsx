"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Pencil, Power, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRoleLabel } from "@/lib/auth/role-labels";
import { RowActions, RowActionsHead, type RowAction } from "@/components/shared/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { deactivateRoleAction, getRoleUsageAction } from "@/lib/rbac/actions";
import { isProtectedRole } from "@/lib/rbac/copy-role-permissions";
import { roleUsersHref } from "@/lib/rbac/role-usage";
import type { Role } from "@/lib/rbac/types";

// ─── Deactivate dialog ───────────────────────────────────────────────────────

type Usage =
  | { state: "checking" }
  | { state: "known"; usersCount: number }
  /** Usage endpoint not available: try the deactivation and read the API error. */
  | { state: "unknown" };

function parseUsersCount(errorMessage: string): number | null {
  // Backend message format: "Cannot deactivate role: N users are currently assigned..."
  const match = /(\d+)\s+user/i.exec(errorMessage);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

function DeactivateDialog({
  role,
  onClose,
  onSuccess,
}: {
  role: Role;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("admin.roles.deactivate");
  const tToasts = useTranslations("rbac.toasts");
  const tScope = useTranslations("admin.roles");
  const translateRole = useRoleLabel();
  const [usage, setUsage] = useState<Usage>({ state: "checking" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRoleUsageAction(role.role_id)
      .then((result) => {
        if (cancelled) return;
        setUsage(
          result.available ? { state: "known", usersCount: result.usersCount } : { state: "unknown" },
        );
      })
      .catch(() => {
        if (!cancelled) setUsage({ state: "unknown" });
      });
    return () => {
      cancelled = true;
    };
  }, [role.role_id]);

  const name = translateRole(role.role_name);
  const permCount = role.role_permissions?.length ?? 0;
  const scope = role.role_category === "CLUB" ? tScope("scopeClub") : tScope("scopeGlobal");
  const blockedCount = usage.state === "known" && usage.usersCount > 0 ? usage.usersCount : null;

  async function handleDeactivate() {
    setLoading(true);
    try {
      const result = await deactivateRoleAction(role.role_id);
      if (!result.error) {
        toast.success(tToasts("role_deactivated", { name: role.role_name }));
        onSuccess();
        onClose();
        return;
      }
      const count = parseUsersCount(result.error);
      if (count !== null) {
        setUsage({ state: "known", usersCount: count });
      } else {
        toast.error(result.error);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("subtitle", { count: permCount, scope: scope.toLowerCase() })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {usage.state === "checking" ? (
          <p className="text-muted-foreground text-sm" role="status">
            {t("checking")}
          </p>
        ) : blockedCount !== null ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium text-foreground">{t("blockedTitle", { count: blockedCount })}</p>
              <p className="mt-1 text-muted-foreground">{t("blockedDescription")}</p>
            </div>
            <Link
              prefetch={false}
              href={roleUsersHref(role.role_name)}
              className="inline-block font-medium text-primary text-sm underline-offset-4 hover:underline"
            >
              {t("viewPeople", { count: blockedCount })}
            </Link>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {usage.state === "known" ? t("noneDescription") : t("unknownDescription")}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{blockedCount !== null ? t("close") : t("cancel")}</AlertDialogCancel>
          {blockedCount === null ? (
            <AlertDialogAction
              variant="destructive-solid"
              loading={loading}
              disabled={usage.state === "checking"}
              onClick={(event) => {
                event.preventDefault();
                void handleDeactivate();
              }}
            >
              {loading ? t("processing") : t("confirm")}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Roles tab ───────────────────────────────────────────────────────────────

type StatusFilter = "all" | "active" | "inactive";

export function RolesTable({ roles, isSuperAdmin }: { roles: Role[]; isSuperAdmin: boolean }) {
  const t = useTranslations("admin.roles");
  const translateRole = useRoleLabel();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [deactivateTarget, setDeactivateTarget] = useState<Role | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles
      .filter((role) => {
        if (status === "active") return role.active !== false;
        if (status === "inactive") return role.active === false;
        return true;
      })
      .filter(
        (role) =>
          !q ||
          role.role_name.toLowerCase().includes(q) ||
          translateRole(role.role_name).toLowerCase().includes(q) ||
          (role.description?.toLowerCase().includes(q) ?? false),
      )
      .sort((a, b) => a.role_name.localeCompare(b.role_name));
  }, [roles, search, status, translateRole]);

  const roleActions = (role: Role): RowAction[] => [
    {
      label: t("actions.edit"),
      icon: Pencil,
      href: `/dashboard/configuration/roles/${role.role_id}`,
    },
    {
      label: t("actions.deactivate"),
      icon: Power,
      destructive: true,
      onSelect: () => setDeactivateTarget(role),
      hidden: role.active === false,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t("searchPlaceholder")}
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger aria-label={t("statusFilter.label")} className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("statusFilter.all")}</SelectItem>
            <SelectItem value="active">{t("statusFilter.active")}</SelectItem>
            <SelectItem value="inactive">{t("statusFilter.inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={search ? t("emptySearchTitle", { query: search }) : t("emptyTitle")}
          description={search ? t("emptySearchDescription") : t("emptyDescription")}
        />
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3">{t("cols.role")}</TableHead>
                <TableHead className="h-9 px-3">{t("cols.scope")}</TableHead>
                <TableHead className="h-9 px-3 text-right">{t("cols.permissions")}</TableHead>
                <TableHead className="h-9 px-3">{t("cols.status")}</TableHead>
                {isSuperAdmin ? <RowActionsHead className="h-9 px-3" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((role) => {
                const protectedRole = isProtectedRole(role);
                return (
                  <TableRow key={role.role_id}>
                    <TableCell className="px-3 py-2.5 align-middle">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5 font-medium text-sm">
                          {translateRole(role.role_name)}
                          {protectedRole ? (
                            <Lock
                              className="size-3.5 shrink-0 text-muted-foreground"
                              aria-label={t("protectedTooltip")}
                            />
                          ) : null}
                        </span>
                        <span className="font-mono text-muted-foreground text-xs">{role.role_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-sm">
                      {role.role_category === "CLUB" ? t("scopeClub") : t("scopeGlobal")}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-right align-middle text-sm tabular-nums">
                      {role.role_permissions?.length ?? 0}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      {role.active === false ? <StatusBadge intent="neutral" label={t("inactive")} /> : null}
                    </TableCell>
                    {isSuperAdmin ? (
                      <TableCell className="px-3 py-2.5 align-middle">
                        {protectedRole ? (
                          <span className="text-muted-foreground text-xs">{t("protected")}</span>
                        ) : (
                          <RowActions label={translateRole(role.role_name)} actions={roleActions(role)} />
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      {deactivateTarget ? (
        <DeactivateDialog
          role={deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onSuccess={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
