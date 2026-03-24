"use client";

import { useState, useTransition } from "react";
import { Plus, X, ShieldAlert, Loader2, Search } from "lucide-react";
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
import type { Role, UserRole } from "@/lib/rbac/types";

interface UserRolesPanelProps {
  userId: string;
  initialUserRoles: UserRole[];
  allRoles: Role[];
}

const ROLE_VARIANT_MAP: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  super_admin: "destructive",
  admin: "default",
  assistant_admin: "default",
};

function getRoleBadgeVariant(roleName: string): "default" | "destructive" | "secondary" | "outline" {
  return ROLE_VARIANT_MAP[roleName] ?? "secondary";
}

export function UserRolesPanel({
  userId,
  initialUserRoles,
  allRoles,
}: UserRolesPanelProps) {
  const [userRoles, setUserRoles] = useState<UserRole[]>(initialUserRoles);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [roleToRemove, setRoleToRemove] = useState<UserRole | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const assignedRoleIds = new Set(userRoles.map((ur) => ur.roles.role_id));

  const availableRoles = allRoles.filter(
    (r) => r.active && !assignedRoleIds.has(r.role_id),
  );

  const filteredRoles = availableRoles.filter(
    (r) =>
      r.role_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.role_category ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  function handleOpenAddDialog() {
    setSearch("");
    setSelectedRoleId("");
    setAddDialogOpen(true);
  }

  function handleAssign() {
    if (!selectedRoleId) {
      toast.error("Selecciona un rol antes de asignar.");
      return;
    }

    startTransition(async () => {
      try {
        await apiRequestFromClient<{ success: boolean; message: string }>(
          `/admin/rbac/users/${encodeURIComponent(userId)}/roles`,
          {
            method: "POST",
            body: { role_id: selectedRoleId },
          },
        );

        const role = allRoles.find((r) => r.role_id === selectedRoleId);
        if (role) {
          const newEntry: UserRole = {
            user_role_id: crypto.randomUUID(),
            user_id: userId,
            role_id: role.role_id,
            active: true,
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
            roles: {
              role_id: role.role_id,
              role_name: role.role_name,
              role_category: role.role_category,
              active: role.active,
            },
          };
          setUserRoles((prev) =>
            [...prev, newEntry].sort((a, b) =>
              a.roles.role_name.localeCompare(b.roles.role_name),
            ),
          );
        }

        toast.success("Rol asignado correctamente.");
        setAddDialogOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "No se pudo asignar el rol.",
        );
      }
    });
  }

  function handleRemove() {
    if (!roleToRemove) return;

    startTransition(async () => {
      try {
        await apiRequestFromClient<{ success: boolean }>(
          `/admin/rbac/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleToRemove.roles.role_id)}`,
          { method: "DELETE" },
        );
        setUserRoles((prev) =>
          prev.filter((ur) => ur.user_role_id !== roleToRemove.user_role_id),
        );
        toast.success("Rol removido correctamente.");
        setRoleToRemove(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "No se pudo remover el rol.",
        );
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <ShieldAlert className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Roles globales</CardTitle>
              <p className="text-xs text-muted-foreground">
                Roles asignados a este usuario que determinan su nivel de acceso
              </p>
            </div>
          </div>
          {availableRoles.length > 0 && (
            <Button size="sm" onClick={handleOpenAddDialog} disabled={isPending}>
              <Plus className="mr-1 size-3.5" />
              Asignar rol
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {userRoles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <ShieldAlert className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Este usuario no tiene roles globales asignados.
              </p>
              {availableRoles.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenAddDialog}
                  disabled={isPending}
                >
                  <Plus className="mr-1 size-3.5" />
                  Asignar rol
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {userRoles.map((ur) => (
                <Badge
                  key={ur.user_role_id}
                  variant={getRoleBadgeVariant(ur.roles.role_name)}
                  className="gap-1.5 pr-1 text-xs"
                >
                  {ur.roles.role_name}
                  <button
                    type="button"
                    onClick={() => setRoleToRemove(ur)}
                    disabled={isPending}
                    className="ml-0.5 rounded-sm opacity-60 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                    title={`Remover ${ur.roles.role_name}`}
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

      {/* Assign Role Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar rol global</DialogTitle>
            <DialogDescription>
              Selecciona un rol para asignar a este usuario. Los roles determinan
              el nivel de acceso al sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar rol..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedRoleId("");
                }}
                className="pl-8"
              />
            </div>

            {filteredRoles.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {search
                  ? "No se encontraron roles que coincidan."
                  : "No hay roles disponibles para asignar."}
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-md border">
                {filteredRoles.map((role) => (
                  <button
                    key={role.role_id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.role_id)}
                    className={[
                      "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors",
                      "hover:bg-muted/50 focus:outline-none focus:bg-muted/50",
                      selectedRoleId === role.role_id
                        ? "bg-primary/10 text-primary"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="text-sm font-medium">{role.role_name}</span>
                    <span className="text-xs text-muted-foreground">
                      Categoria: {role.role_category}
                    </span>
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
              disabled={isPending || !selectedRoleId}
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Asignar rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation AlertDialog */}
      {roleToRemove && (
        <AlertDialog
          open={!!roleToRemove}
          onOpenChange={(open) => {
            if (!open) setRoleToRemove(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover rol global?</AlertDialogTitle>
              <AlertDialogDescription>
                Se removera el rol{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-semibold">
                  {roleToRemove.roles.role_name}
                </code>{" "}
                de este usuario. Esto puede cambiar significativamente su nivel de
                acceso al sistema.
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
