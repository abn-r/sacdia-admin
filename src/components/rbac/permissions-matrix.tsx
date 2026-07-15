"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
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
import type { Permission, Role } from "@/lib/rbac/types";
import type { RbacActionState } from "@/lib/rbac/types";

type ToggleAction = (
  roleId: string,
  permissionId: string,
  enabled: boolean,
) => Promise<RbacActionState>;

interface PermissionsMatrixProps {
  roles: Role[];
  permissions: Permission[];
  toggleAction: ToggleAction;
}

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

export function PermissionsMatrix({
  roles,
  permissions,
  toggleAction,
}: PermissionsMatrixProps) {
  const t = useTranslations("rbac.pages.matrix");

  const [selections, setSelections] = useState<Selections>(() =>
    buildInitialSelections(roles),
  );
  const [pendingCells, setPendingCells] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");

  const filteredPermissions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter((p) => {
      const name = p.permission_name?.toLowerCase() ?? "";
      const desc = p.description?.toLowerCase() ?? "";
      return name.includes(q) || desc.includes(q);
    });
  }, [permissions, query]);

  function showPermissionToast(
    type: "added" | "removed",
    permission: Permission,
    role: Role,
  ) {
    toast.message(
      type === "added" ? t("permissionAddedTitle") : t("permissionRemovedTitle"),
      {
        description: t("permissionToastDesc", {
          permission: permission.permission_name,
          role: role.role_name,
        }),
        classNames: MATRIX_TOAST_CLASSNAMES,
      },
    );
  }

  async function togglePermission(role: Role, permission: Permission) {
    const key = cellKey(role.role_id, permission.permission_id);
    if (pendingCells.has(key)) {
      return;
    }

    const wasSelected =
      selections[role.role_id]?.has(permission.permission_id) ?? false;
    const nextSelected = !wasSelected;

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
      toast.error(t("toggleError", { role: role.role_name }), {
        description: result.error,
        classNames: MATRIX_TOAST_CLASSNAMES,
      });
      return;
    }

    showPermissionToast(nextSelected ? "added" : "removed", permission, role);
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
                    <span className="text-xs leading-tight">{role.role_name}</span>
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
            {filteredPermissions.map((permission) => (
              <tr
                key={permission.permission_id}
                className="border-b last:border-b-0 hover:bg-muted/30"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r bg-card px-3 py-2 text-left align-top font-normal"
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-medium text-foreground">
                      {permission.permission_name}
                    </span>
                    {permission.description && (
                      <span className="text-xs text-muted-foreground">
                        {permission.description}
                      </span>
                    )}
                  </div>
                </th>
                {roles.map((role) => {
                  const selected = selections[role.role_id]?.has(
                    permission.permission_id,
                  );
                  const pending = pendingCells.has(
                    cellKey(role.role_id, permission.permission_id),
                  );
                  const checkboxId = `m-${role.role_id}-${permission.permission_id}`;
                  return (
                    <td
                      key={role.role_id}
                      className="border-r px-2 py-2 text-center align-middle last:border-r-0"
                    >
                      <Label
                        htmlFor={checkboxId}
                        className="flex cursor-pointer items-center justify-center"
                      >
                        <span className="sr-only">
                          {permission.permission_name} · {role.role_name}
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
                              void togglePermission(role, permission)
                            }
                            disabled={pending}
                          />
                        )}
                      </Label>
                    </td>
                  );
                })}
              </tr>
            ))}
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
