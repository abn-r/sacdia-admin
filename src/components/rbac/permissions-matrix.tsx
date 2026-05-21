"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Save, Search, Undo2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Permission, Role } from "@/lib/rbac/types";
import type { RbacActionState } from "@/lib/rbac/types";

type SyncAction = (
  roleId: string,
  prev: RbacActionState,
  formData: FormData,
) => Promise<RbacActionState>;

interface PermissionsMatrixProps {
  roles: Role[];
  permissions: Permission[];
  syncAction: SyncAction;
}

type Selections = Record<string, Set<string>>;

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

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function PermissionsMatrix({
  roles,
  permissions,
  syncAction,
}: PermissionsMatrixProps) {
  const t = useTranslations("rbac.matrix");

  const initialSelections = useMemo(
    () => buildInitialSelections(roles),
    [roles],
  );
  const [selections, setSelections] = useState<Selections>(() =>
    buildInitialSelections(roles),
  );
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
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

  function togglePermission(roleId: string, permissionId: string) {
    setSelections((prev) => {
      const next = { ...prev };
      const current = new Set(prev[roleId] ?? []);
      if (current.has(permissionId)) {
        current.delete(permissionId);
      } else {
        current.add(permissionId);
      }
      next[roleId] = current;
      return next;
    });
  }

  function isDirty(roleId: string): boolean {
    const initial = initialSelections[roleId] ?? new Set<string>();
    const current = selections[roleId] ?? new Set<string>();
    return !setsEqual(initial, current);
  }

  function discardRole(roleId: string) {
    setSelections((prev) => ({
      ...prev,
      [roleId]: new Set(initialSelections[roleId] ?? []),
    }));
  }

  function saveRole(role: Role) {
    const selected = selections[role.role_id] ?? new Set<string>();
    const formData = new FormData();
    formData.set("permission_ids", Array.from(selected).join(","));
    setSavingRoleId(role.role_id);
    startTransition(async () => {
      const result = await syncAction(role.role_id, {}, formData);
      setSavingRoleId(null);
      if (result.error) {
        toast.error(t("saveError", { role: role.role_name }), {
          description: result.error,
        });
      } else {
        toast.success(t("saveSuccess", { role: role.role_name }));
        initialSelections[role.role_id] = new Set(selected);
      }
    });
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
              {roles.map((role) => {
                const dirty = isDirty(role.role_id);
                const saving = savingRoleId === role.role_id;
                return (
                  <th
                    key={role.role_id}
                    scope="col"
                    className="min-w-[160px] border-b border-r px-2 py-2 text-center align-bottom font-medium last:border-r-0"
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-xs leading-tight">
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
                      {dirty && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            onClick={() => discardRole(role.role_id)}
                            disabled={saving}
                            aria-label={t("discard")}
                          >
                            <Undo2 className="size-3" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            onClick={() => saveRole(role)}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2
                                className="size-3 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Save className="size-3" aria-hidden="true" />
                            )}
                            {saving ? t("saving") : t("saveChanges")}
                          </Button>
                        </div>
                      )}
                      {dirty && (
                        <span className="sr-only">{t("dirtyBadge")}</span>
                      )}
                    </div>
                  </th>
                );
              })}
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
                  const dirty = isDirty(role.role_id);
                  const checkboxId = `m-${role.role_id}-${permission.permission_id}`;
                  return (
                    <td
                      key={role.role_id}
                      className={`border-r px-2 py-2 text-center align-middle last:border-r-0 ${
                        dirty ? "bg-warning-soft/30" : ""
                      }`}
                    >
                      <Label
                        htmlFor={checkboxId}
                        className="flex cursor-pointer items-center justify-center"
                      >
                        <span className="sr-only">
                          {permission.permission_name} · {role.role_name}
                        </span>
                        <Checkbox
                          id={checkboxId}
                          checked={selected}
                          onCheckedChange={() =>
                            togglePermission(
                              role.role_id,
                              permission.permission_id,
                            )
                          }
                          disabled={savingRoleId === role.role_id}
                        />
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
