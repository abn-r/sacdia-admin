"use client";

import { useState, useTransition, Fragment } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Role, Permission, RbacActionState } from "@/lib/rbac/types";

type SyncAction = (roleId: string, prev: RbacActionState, formData: FormData) => Promise<RbacActionState>;

interface PermissionMatrixProps {
  roles: Role[];
  permissions: Permission[];
  syncAction: SyncAction;
}

type MatrixState = Record<string, Set<string>>;
type SaveState = Record<string, "idle" | "saving" | "saved" | "error">;

function buildInitialMatrix(roles: Role[]): MatrixState {
  const matrix: MatrixState = {};
  for (const role of roles) {
    matrix[role.role_id] = new Set(
      role.role_permissions?.map((rp) => rp.permission_id) ?? [],
    );
  }
  return matrix;
}

export function PermissionMatrix({ roles, permissions, syncAction }: PermissionMatrixProps) {
  const [matrix, setMatrix] = useState<MatrixState>(() => buildInitialMatrix(roles));
  const [saveState, setSaveState] = useState<SaveState>(() =>
    Object.fromEntries(roles.map((r) => [r.role_id, "idle"])),
  );
  const [dirtyRoles, setDirtyRoles] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const activePermissions = permissions.filter((p) => p.active);

  function toggleCell(roleId: string, permId: string) {
    setMatrix((prev) => {
      const next = { ...prev };
      const perms = new Set(next[roleId]);
      if (perms.has(permId)) perms.delete(permId);
      else perms.add(permId);
      next[roleId] = perms;
      return next;
    });
    setDirtyRoles((prev) => new Set(prev).add(roleId));
    setSaveState((prev) => ({ ...prev, [roleId]: "idle" }));
  }

  function saveRole(roleId: string) {
    const permIds = Array.from(matrix[roleId] ?? []);
    setSaveState((prev) => ({ ...prev, [roleId]: "saving" }));

    const boundAction = syncAction.bind(null, roleId);
    const formData = new FormData();
    formData.set("permission_ids", permIds.join(","));

    startTransition(async () => {
      const result = await boundAction({}, formData);
      setSaveState((prev) => ({
        ...prev,
        [roleId]: result.error ? "error" : "saved",
      }));
      setDirtyRoles((prev) => {
        const next = new Set(prev);
        next.delete(roleId);
        return next;
      });
    });
  }

  function saveAll() {
    for (const roleId of dirtyRoles) {
      saveRole(roleId);
    }
  }

  const groupedPermissions = activePermissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    const group = perm.permission_name.split(":")[0] ?? "other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {});

  const groups = Object.entries(groupedPermissions).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      {dirtyRoles.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-warning/30 bg-warning/10 px-4 py-2">
          <p className="text-sm text-warning-foreground dark:text-warning">
            {dirtyRoles.size} rol{dirtyRoles.size > 1 ? "es" : ""} con cambios sin guardar.
          </p>
          <Button size="sm" onClick={saveAll} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Guardar todos
          </Button>
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-10 min-w-[220px] bg-muted/50 px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Permiso
              </th>
              {roles.map((role) => (
                <th key={role.role_id} className="min-w-[120px] px-2 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium leading-tight">{role.role_name}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        {matrix[role.role_id]?.size ?? 0}
                      </Badge>
                      {dirtyRoles.has(role.role_id) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1.5 text-[10px]"
                          onClick={() => saveRole(role.role_id)}
                          disabled={saveState[role.role_id] === "saving"}
                          title="Guardar cambios de este rol"
                        >
                          {saveState[role.role_id] === "saving" ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Save className="size-3" />
                          )}
                        </Button>
                      )}
                      {saveState[role.role_id] === "saved" && (
                        <Check className="size-3 text-success" />
                      )}
                      {saveState[role.role_id] === "error" && (
                        <span className="text-[10px] text-destructive">!</span>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(([group, perms]) => (
              <Fragment key={group}>
                <tr className="border-b bg-muted/30">
                  <td
                    colSpan={roles.length + 1}
                    className="sticky left-0 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {group}
                  </td>
                </tr>
                {perms.map((perm) => (
                  <tr key={perm.permission_id} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="sticky left-0 z-10 bg-background px-4 py-2.5">
                      <div className="flex flex-col">
                        {perm.description && (
                          <span className="text-[22px] font-bold text-muted-foreground">{perm.description}</span>
                        )}
                        <code className="text-xs font-mono text-muted-foreground">{perm.permission_name}</code>
                      </div>
                    </td>
                    {roles.map((role) => {
                      const checked = matrix[role.role_id]?.has(perm.permission_id) ?? false;
                      return (
                        <td key={role.role_id} className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCell(role.role_id, perm.permission_id)}
                            className={cn(
                              "mx-auto flex size-6 items-center justify-center rounded border transition-colors",
                              checked
                                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/80"
                                : "border-border bg-background hover:border-primary/50 hover:bg-muted",
                            )}
                            aria-label={checked ? "Quitar permiso" : "Asignar permiso"}
                            aria-pressed={checked}
                          >
                            {checked && <Check className="size-3.5" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {activePermissions.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">No hay permisos activos.</p>
      )}
    </div>
  );
}
