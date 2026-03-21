"use client";

import { useState, useTransition } from "react";
import { Plus, X, ShieldCheck, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { apiRequestFromClient } from "@/lib/api/client";
import type { Permission, UserPermission } from "@/lib/rbac/types";

interface UserPermissionsPanelProps {
  userId: string;
  initialUserPermissions: UserPermission[];
  allPermissions: Permission[];
}

export function UserPermissionsPanel({
  userId,
  initialUserPermissions,
  allPermissions,
}: UserPermissionsPanelProps) {
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>(initialUserPermissions);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [permToRemove, setPermToRemove] = useState<UserPermission | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPermId, setSelectedPermId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const assignedPermissionIds = new Set(userPermissions.map((up) => up.permission_id));

  const availablePermissions = allPermissions.filter(
    (p) => p.active && !assignedPermissionIds.has(p.permission_id),
  );

  const filteredPermissions = availablePermissions.filter((p) =>
    p.permission_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  function handleOpenAddDialog() {
    setSearch("");
    setSelectedPermId("");
    setAddDialogOpen(true);
  }

  function handleAssign() {
    if (!selectedPermId) {
      toast.error("Seleccioná un permiso antes de asignar.");
      return;
    }

    startTransition(async () => {
      try {
        await apiRequestFromClient<{ success: boolean; message: string }>(
          `/admin/rbac/users/${encodeURIComponent(userId)}/permissions`,
          {
            method: "POST",
            body: { permission_ids: [selectedPermId] },
          },
        );

        const perm = allPermissions.find((p) => p.permission_id === selectedPermId);
        if (perm) {
          const newEntry: UserPermission = {
            user_permission_id: crypto.randomUUID(),
            user_id: userId,
            permission_id: perm.permission_id,
            active: true,
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
            permissions: {
              permission_id: perm.permission_id,
              permission_name: perm.permission_name,
              description: perm.description,
              active: perm.active,
            },
          };
          setUserPermissions((prev) =>
            [...prev, newEntry].sort((a, b) =>
              a.permissions.permission_name.localeCompare(b.permissions.permission_name),
            ),
          );
        }

        toast.success("Permiso asignado correctamente.");
        setAddDialogOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo asignar el permiso.");
      }
    });
  }

  function handleRemove() {
    if (!permToRemove) return;

    startTransition(async () => {
      try {
        await apiRequestFromClient<{ success: boolean }>(
          `/admin/rbac/users/${encodeURIComponent(userId)}/permissions/${encodeURIComponent(permToRemove.permission_id)}`,
          { method: "DELETE" },
        );
        setUserPermissions((prev) =>
          prev.filter((up) => up.user_permission_id !== permToRemove.user_permission_id),
        );
        toast.success("Permiso removido correctamente.");
        setPermToRemove(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo remover el permiso.");
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Permisos directos</CardTitle>
              <p className="text-xs text-muted-foreground">
                Permisos asignados directamente a este usuario (sin pasar por roles)
              </p>
            </div>
          </div>
          {availablePermissions.length > 0 && (
            <Button size="sm" onClick={handleOpenAddDialog} disabled={isPending}>
              <Plus className="mr-1 size-3.5" />
              Agregar permiso
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {userPermissions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <ShieldCheck className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Este usuario no tiene permisos directos asignados.
              </p>
              {availablePermissions.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleOpenAddDialog} disabled={isPending}>
                  <Plus className="mr-1 size-3.5" />
                  Agregar permiso
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {userPermissions.map((up) => (
                <Badge
                  key={up.user_permission_id}
                  variant="secondary"
                  className="gap-1.5 pr-1 font-mono text-xs"
                >
                  {up.permissions.permission_name}
                  <button
                    type="button"
                    onClick={() => setPermToRemove(up)}
                    disabled={isPending}
                    className="ml-0.5 rounded-sm opacity-60 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                    title={`Remover ${up.permissions.permission_name}`}
                  >
                    <X className="size-3" />
                    <span className="sr-only">Remover</span>
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Permission Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar permiso directo</DialogTitle>
            <DialogDescription>
              Seleccioná un permiso para asignar directamente a este usuario.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar permiso..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedPermId("");
                }}
                className="pl-8"
              />
            </div>

            {filteredPermissions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {search
                  ? "No se encontraron permisos que coincidan."
                  : "No hay permisos disponibles para asignar."}
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-md border">
                {filteredPermissions.map((perm) => (
                  <button
                    key={perm.permission_id}
                    type="button"
                    onClick={() => setSelectedPermId(perm.permission_id)}
                    className={[
                      "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors",
                      "hover:bg-muted/50 focus:outline-none focus:bg-muted/50",
                      selectedPermId === perm.permission_id
                        ? "bg-primary/10 text-primary"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <code className="font-mono text-xs font-medium">
                      {perm.permission_name}
                    </code>
                    {perm.description && (
                      <span className="text-xs text-muted-foreground">
                        {perm.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              disabled={isPending || !selectedPermId}
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Asignar permiso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation AlertDialog */}
      {permToRemove && (
        <AlertDialog
          open={!!permToRemove}
          onOpenChange={(open) => {
            if (!open) setPermToRemove(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Remover permiso directo?</AlertDialogTitle>
              <AlertDialogDescription>
                Se removerá el permiso{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  {permToRemove.permissions.permission_name}
                </code>{" "}
                asignado directamente a este usuario. El usuario puede seguir teniendo el permiso
                a través de sus roles.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                disabled={isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
