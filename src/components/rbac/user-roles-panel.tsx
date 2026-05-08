"use client";

import { useState, useTransition } from "react";
import { Plus, X, ShieldAlert, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
  "super-admin": "destructive",
  admin: "default",
  "assistant-admin": "default",
};

function getRoleBadgeVariant(roleName: string): "default" | "destructive" | "secondary" | "outline" {
  return ROLE_VARIANT_MAP[roleName] ?? "secondary";
}

export function UserRolesPanel({
  userId,
  initialUserRoles,
  allRoles,
}: UserRolesPanelProps) {
  const t = useTranslations("rbac");
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
      toast.error(t("validation.role_required"));
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

        toast.success(t("toasts.role_assigned"));
        setAddDialogOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("errors.assign_role_failed"),
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
        toast.success(t("toasts.role_removed"));
        setRoleToRemove(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("errors.remove_role_failed"),
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
              <CardTitle className="text-base">{t("userRolesPanel.title")}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("userRolesPanel.subtitle")}
              </p>
            </div>
          </div>
          {availableRoles.length > 0 && (
            <Button size="sm" onClick={handleOpenAddDialog} disabled={isPending}>
              <Plus className="mr-1 size-3.5" />
              {t("userRolesPanel.assignRole")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {userRoles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <ShieldAlert className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {t("userRolesPanel.emptyState")}
              </p>
              {availableRoles.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenAddDialog}
                  disabled={isPending}
                >
                  <Plus className="mr-1 size-3.5" />
                  {t("userRolesPanel.assignRole")}
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
                    title={t("userRolesPanel.removeRoleTitle", { name: ur.roles.role_name })}
                  >
                    <X className="size-3" />
                    <span className="sr-only">{t("userRolesPanel.removeSrOnly")}</span>
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
            <DialogTitle>{t("userRolesPanel.assignDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("userRolesPanel.assignDialogDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder={t("userRolesPanel.searchPlaceholder")}
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
                  ? t("userRolesPanel.noMatchingRoles")
                  : t("userRolesPanel.noAvailableRoles")}
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
                      {t("userRolesPanel.categoryLabel")}: {role.role_category}
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
              {t("userRolesPanel.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              disabled={isPending || !selectedRoleId}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("userRolesPanel.assignRole")}
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
              <AlertDialogTitle>{t("userRolesPanel.removeDialogTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("userRolesPanel.removeDialogDescPre")}{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-semibold">
                  {roleToRemove.roles.role_name}
                </code>{" "}
                {t("userRolesPanel.removeDialogDescPost")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>{t("userRolesPanel.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                disabled={isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {t("userRolesPanel.remove")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
