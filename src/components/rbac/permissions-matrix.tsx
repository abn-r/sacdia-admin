"use client";

import { Fragment, useMemo, useState } from "react";
import { Loader2, Search, ShieldAlert } from "lucide-react";
import { useTranslations as useTranslationsStrict } from "next-intl";
import { toast } from "sonner";

type LooseTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const useTranslations = useTranslationsStrict as unknown as (
  namespace?: string,
) => LooseTranslator;
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getPermissionLabel,
  permissionMatchesQuery,
} from "@/lib/auth/permissions";
import { useRoleLabel } from "@/lib/auth/role-labels";
import { groupByScreen, type ScreenKeyGroup } from "@/lib/auth/screen-catalog";
import {
  bundleState,
  planBundle,
  planToggle,
  type MatrixPlan,
} from "@/lib/auth/screen-catalog/matrix-plan";
import {
  getScreenGroupTitle,
  type NavTranslator,
} from "@/lib/auth/screen-catalog/screen-title";
import type { Permission, Role } from "@/lib/rbac/types";
import type { RbacActionState } from "@/lib/rbac/types";

type ToggleAction = (
  roleId: string,
  permissionId: string,
  enabled: boolean,
) => Promise<RbacActionState>;

type SetAction = (
  roleId: string,
  permissionIds: string[],
) => Promise<RbacActionState>;

interface PermissionsMatrixProps {
  roles: Role[];
  permissions: Permission[];
  toggleAction: ToggleAction;
  /** Full replace (`PUT`). Required for screen bundles and cascades. */
  setAction: SetAction;
  canWrite?: boolean;
}

/** roleId → granted permission ids */
type Selections = Record<string, Set<string>>;

const MATRIX_TOAST_CLASSNAMES = {
  toast: "min-w-[min(22rem,calc(100vw-2rem))] max-w-md",
  title: "font-medium",
  description: "text-pretty [overflow-wrap:anywhere]",
} as const;

function buildInitialSelections(roles: Role[]): Selections {
  const out: Selections = {};
  for (const role of roles) {
    out[role.role_id] = new Set(
      role.role_permissions
        .filter((rp) => rp.active)
        .map((rp) => rp.permission_id),
    );
  }
  return out;
}

function cellKey(roleId: string, permissionId: string) {
  return `${roleId}:${permissionId}`;
}

function groupKey(roleId: string, screenId: string) {
  return `${roleId}@${screenId}`;
}

export function PermissionsMatrix({
  roles,
  permissions,
  toggleAction,
  setAction,
  canWrite = false,
}: PermissionsMatrixProps) {
  const t = useTranslations("rbac.pages.matrix");
  const tRbac = useTranslations("rbac");
  const tNav = useTranslationsStrict("nav.items") as unknown as NavTranslator;
  const translateRole = useRoleLabel();

  const [selections, setSelections] = useState<Selections>(() =>
    buildInitialSelections(roles),
  );
  const [pendingCells, setPendingCells] = useState<Set<string>>(() => new Set());
  const [pendingGroups, setPendingGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [query, setQuery] = useState("");

  // key ↔ id maps: the catalog speaks in keys, the API in ids.
  const keyToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const permission of permissions) {
      map.set(permission.permission_name.toLowerCase(), permission.permission_id);
    }
    return map;
  }, [permissions]);
  const idToKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const permission of permissions) {
      map.set(permission.permission_id, permission.permission_name.toLowerCase());
    }
    return map;
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter((p) => permissionMatchesQuery(tRbac, p, q));
  }, [permissions, query, tRbac]);

  const groups = useMemo(
    () => groupByScreen(filteredPermissions, (p) => p.permission_name),
    [filteredPermissions],
  );

  function grantedKeys(roleId: string): Set<string> {
    const out = new Set<string>();
    for (const id of selections[roleId] ?? []) {
      const key = idToKey.get(id);
      if (key) out.add(key);
    }
    return out;
  }

  function idsFromKeys(keys: ReadonlySet<string>): string[] {
    const ids: string[] = [];
    for (const key of keys) {
      const id = keyToId.get(key);
      if (id) ids.push(id);
    }
    return ids;
  }

  function showPermissionToast(
    type: "added" | "removed",
    permission: Permission,
    role: Role,
  ) {
    toast.message(
      type === "added" ? t("permissionAddedTitle") : t("permissionRemovedTitle"),
      {
        description: t("permissionToastDesc", {
          permission: getPermissionLabel(tRbac, permission.permission_name),
          role: translateRole(role.role_name),
        }),
        classNames: MATRIX_TOAST_CLASSNAMES,
      },
    );
  }

  /** Applies a full-set plan with one PUT; rolls back on error. */
  async function applyBulk(
    role: Role,
    plan: Extract<MatrixPlan, { mode: "bulk" }>,
    pendingKey: string,
    screenTitle: string,
  ) {
    const previous = selections[role.role_id] ?? new Set<string>();
    const nextIds = new Set(idsFromKeys(plan.next));
    // Keep ids the catalog does not know about (orphans outside this group).
    for (const id of previous) {
      const key = idToKey.get(id);
      if (!key || !keyToId.has(key)) nextIds.add(id);
    }

    setSelections((prev) => ({ ...prev, [role.role_id]: nextIds }));
    setPendingGroups((prev) => new Set(prev).add(pendingKey));

    const result = await setAction(role.role_id, Array.from(nextIds));

    setPendingGroups((prev) => {
      const next = new Set(prev);
      next.delete(pendingKey);
      return next;
    });

    if (result.error) {
      setSelections((prev) => ({ ...prev, [role.role_id]: previous }));
      toast.error(t("toggleError", { role: translateRole(role.role_name) }), {
        description: result.error,
        classNames: MATRIX_TOAST_CLASSNAMES,
      });
      return;
    }

    toast.message(t("bundleUpdatedTitle"), {
      description: t("bundleUpdatedDesc", {
        screen: screenTitle,
        role: translateRole(role.role_name),
      }),
      classNames: MATRIX_TOAST_CLASSNAMES,
    });
  }

  async function togglePermission(
    role: Role,
    permission: Permission,
    group: ScreenKeyGroup<Permission>,
  ) {
    const key = cellKey(role.role_id, permission.permission_id);
    if (pendingCells.has(key) || pendingGroups.has(groupKey(role.role_id, group.screenId))) {
      return;
    }

    const wasSelected =
      selections[role.role_id]?.has(permission.permission_id) ?? false;
    const nextSelected = !wasSelected;

    const plan = planToggle(
      group.screen ? group.screenId : null,
      grantedKeys(role.role_id),
      permission.permission_name.toLowerCase(),
      nextSelected,
    );

    if (plan.mode === "bulk") {
      await applyBulk(
        role,
        plan,
        groupKey(role.role_id, group.screenId),
        getScreenGroupTitle(tNav, group, t("otherGroup")),
      );
      return;
    }

    setSelections((prev) => {
      const next = { ...prev };
      const current = new Set(prev[role.role_id] ?? []);
      if (nextSelected) {
        current.add(permission.permission_id);
      } else {
        current.delete(permission.permission_id);
      }
      next[role.role_id] = current;
      return next;
    });
    setPendingCells((prev) => new Set(prev).add(key));

    const result = await toggleAction(
      role.role_id,
      permission.permission_id,
      nextSelected,
    );

    setPendingCells((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

    if (result.error) {
      setSelections((prev) => {
        const next = { ...prev };
        const current = new Set(prev[role.role_id] ?? []);
        if (wasSelected) {
          current.add(permission.permission_id);
        } else {
          current.delete(permission.permission_id);
        }
        next[role.role_id] = current;
        return next;
      });
      toast.error(t("toggleError", { role: translateRole(role.role_name) }), {
        description: result.error,
        classNames: MATRIX_TOAST_CLASSNAMES,
      });
      return;
    }

    showPermissionToast(nextSelected ? "added" : "removed", permission, role);
  }

  async function toggleBundle(
    role: Role,
    group: ScreenKeyGroup<Permission>,
    enabled: boolean,
  ) {
    if (!group.screen) return;
    const pendingKey = groupKey(role.role_id, group.screenId);
    if (pendingGroups.has(pendingKey)) return;

    const plan = planBundle(group.screenId, grantedKeys(role.role_id), enabled);
    if (!plan || plan.mode !== "bulk") return;

    await applyBulk(
      role,
      plan,
      pendingKey,
      getScreenGroupTitle(tNav, group, t("otherGroup")),
    );
  }

  if (filteredPermissions.length === 0 && query.trim() !== "") {
    return (
      <div className="space-y-4">
        <SearchBar query={query} onChange={setQuery} placeholder={t("searchPlaceholder")} />
        <EmptyState
          icon={Search}
          title={t("noMatches")}
          description={t("noMatchesDesc")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar query={query} onChange={setQuery} placeholder={t("searchPlaceholder")} />

      <div className="overflow-auto rounded-lg border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-30 min-w-[260px] border-b border-r bg-muted/80 px-3 py-2.5 text-left font-medium text-foreground"
              >
                {t("permissionColumn")}
              </th>
              {roles.map((role) => (
                <th
                  key={role.role_id}
                  scope="col"
                  className="min-w-[160px] border-b border-r px-2 py-2 text-center align-bottom font-medium last:border-r-0"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-xs leading-tight">
                      {translateRole(role.role_name)}
                    </span>
                    <span className="font-mono text-[10px] font-normal text-muted-foreground">
                      {role.role_name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wide"
                    >
                      {role.role_category === "CLUB"
                        ? t("categoryClub")
                        : t("categoryGlobal")}
                    </Badge>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const title = getScreenGroupTitle(tNav, group, t("otherGroup"));
              const groupKeys = group.items.map((p) =>
                p.permission_name.toLowerCase(),
              );
              const isScreen = Boolean(group.screen);

              return (
                <Fragment key={group.screenId}>
                  <tr className="border-b bg-muted/40">
                    <th
                      scope="rowgroup"
                      className="sticky left-0 z-10 border-r bg-muted/40 px-3 py-2 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                          {title}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {group.items.length}
                        </span>
                        {group.requiredRoles.length > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="inline-flex items-center text-warning"
                                aria-label={t("requiresRoles", {
                                  roles: group.requiredRoles.join(", "),
                                })}
                              >
                                <ShieldAlert className="size-3.5" aria-hidden="true" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t("requiresRoles", {
                                roles: group.requiredRoles.join(", "),
                              })}
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    </th>
                    {roles.map((role) => {
                      if (!isScreen) {
                        return (
                          <td
                            key={role.role_id}
                            className="border-r px-2 py-2 last:border-r-0"
                          />
                        );
                      }
                      const state = bundleState(groupKeys, grantedKeys(role.role_id));
                      const pending = pendingGroups.has(
                        groupKey(role.role_id, group.screenId),
                      );
                      const checkboxId = `g-${role.role_id}-${group.screenId}`;
                      return (
                        <td
                          key={role.role_id}
                          className="border-r px-2 py-2 text-center align-middle last:border-r-0"
                        >
                          <Label
                            htmlFor={checkboxId}
                            className={
                              canWrite
                                ? "flex cursor-pointer items-center justify-center"
                                : "flex cursor-default items-center justify-center"
                            }
                          >
                            <span className="sr-only">
                              {t("fullScreen")} · {title} ·{" "}
                              {translateRole(role.role_name)}
                            </span>
                            {pending ? (
                              <Loader2
                                className="size-4 animate-spin text-muted-foreground"
                                aria-hidden="true"
                              />
                            ) : (
                              <Checkbox
                                id={checkboxId}
                                checked={
                                  state === "all"
                                    ? true
                                    : state === "some"
                                      ? "indeterminate"
                                      : false
                                }
                                onCheckedChange={(checked) =>
                                  void toggleBundle(role, group, checked === true)
                                }
                                disabled={!canWrite}
                                title={t("fullScreen")}
                              />
                            )}
                          </Label>
                        </td>
                      );
                    })}
                  </tr>

                  {group.items.map((permission) => (
                    <tr
                      key={permission.permission_id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-r bg-card px-3 py-2 pl-6 text-left align-top font-normal"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {getPermissionLabel(tRbac, permission.permission_name)}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {permission.permission_name}
                          </span>
                        </div>
                      </th>
                      {roles.map((role) => {
                        const selected = selections[role.role_id]?.has(
                          permission.permission_id,
                        );
                        const pending =
                          pendingCells.has(
                            cellKey(role.role_id, permission.permission_id),
                          ) ||
                          pendingGroups.has(groupKey(role.role_id, group.screenId));
                        const checkboxId = `m-${role.role_id}-${permission.permission_id}`;
                        return (
                          <td
                            key={role.role_id}
                            className="border-r px-2 py-2 text-center align-middle last:border-r-0"
                          >
                            <Label
                              htmlFor={checkboxId}
                              className={
                                canWrite
                                  ? "flex cursor-pointer items-center justify-center"
                                  : "flex cursor-default items-center justify-center"
                              }
                            >
                              <span className="sr-only">
                                {getPermissionLabel(tRbac, permission.permission_name)}{" "}
                                · {translateRole(role.role_name)}
                              </span>
                              {pending ? (
                                <Loader2
                                  className="size-4 animate-spin text-muted-foreground"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Checkbox
                                  id={checkboxId}
                                  checked={selected}
                                  onCheckedChange={() =>
                                    void togglePermission(role, permission, group)
                                  }
                                  disabled={pending || !canWrite}
                                />
                              )}
                            </Label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SearchBar({
  query,
  onChange,
  placeholder,
}: {
  query: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative max-w-sm">
      <Search
        className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}
