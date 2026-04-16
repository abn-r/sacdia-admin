"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Role, Permission, RbacActionState } from "@/lib/rbac/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      Guardar permisos
    </Button>
  );
}

type SyncAction = (roleId: string, prev: RbacActionState, formData: FormData) => Promise<RbacActionState>;

interface RolesCardsProps {
  roles: Role[];
  allPermissions: Permission[];
  syncAction: SyncAction;
}

export function RolesCards({ roles, allPermissions, syncAction }: RolesCardsProps) {
  const [syncRole, setSyncRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  function openSync(role: Role) {
    const current = new Set(
      role.role_permissions?.map((rp) => rp.permission_id) ?? [],
    );
    setSelectedPerms(current);
    setSyncRole(role);
  }

  function togglePerm(permId: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }

  const boundSyncAction = syncRole
    ? syncAction.bind(null, syncRole.role_id)
    : async (_: RbacActionState, __: FormData): Promise<RbacActionState> => ({ error: "No role" });

  const [syncState, syncFormAction] = useActionState(boundSyncAction, {});

  return (
    <>
      <div className="grid gap-4">
        {roles.map((role) => {
          const permCount = role.role_permissions?.length ?? 0;
          return (
            <Card key={role.role_id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{role.role_name}</CardTitle>
                  {role.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{permCount} permisos</Badge>
                  {allPermissions.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => openSync(role)}>
                      <Settings className="mr-1 size-3.5" />
                      Gestionar
                    </Button>
                  )}
                </div>
              </CardHeader>
              {role.role_permissions && role.role_permissions.length > 0 && (
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {role.role_permissions.map((rp) => (
                      <Badge key={rp.role_permission_id} variant="outline" className="text-xs font-mono">
                        {rp.permissions?.permission_name ?? rp.permission_id}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {syncRole && (
        <Dialog open={!!syncRole} onOpenChange={(open) => { if (!open) setSyncRole(null); }}>
          <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Permisos de {syncRole.role_name}</DialogTitle>
              <DialogDescription>
                Selecciona los permisos que debe tener este rol. Al guardar se sincronizarán (agregar/quitar).
              </DialogDescription>
            </DialogHeader>

            <form action={syncFormAction} className="space-y-4">
              {syncState.error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{syncState.error}</div>
              )}
              {syncState.success && (
                <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{syncState.success}</div>
              )}

              <input type="hidden" name="permission_ids" value={Array.from(selectedPerms).join(",")} />

              <div className="space-y-2 rounded-md border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {selectedPerms.size} de {allPermissions.length} seleccionados
                </p>
                {allPermissions
                  .filter((p) => p.active)
                  .map((perm) => (
                    <div key={perm.permission_id} className="flex items-center gap-2">
                      <Checkbox
                        id={`perm_${perm.permission_id}`}
                        checked={selectedPerms.has(perm.permission_id)}
                        onCheckedChange={() => togglePerm(perm.permission_id)}
                      />
                      <Label htmlFor={`perm_${perm.permission_id}`} className="flex-1 cursor-pointer">
                        <code className="text-xs font-mono">{perm.permission_name}</code>
                        {perm.description && (
                          <span className="ml-2 text-xs text-muted-foreground">{perm.description}</span>
                        )}
                      </Label>
                    </div>
                  ))}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSyncRole(null)}>Cancelar</Button>
                <SubmitButton />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
