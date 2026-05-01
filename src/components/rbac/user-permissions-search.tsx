"use client";

import { useState, useTransition } from "react";
import { Search, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequestFromClient } from "@/lib/api/client";
import { UserPermissionsPanel } from "@/components/rbac/user-permissions-panel";
import type { Permission, UserPermission } from "@/lib/rbac/types";

interface UserPermissionsSearchProps {
  allPermissions: Permission[];
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function UserPermissionsSearch({ allPermissions }: UserPermissionsSearchProps) {
  const t = useTranslations("rbac");
  const [userIdInput, setUserIdInput] = useState("");
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch() {
    const trimmed = userIdInput.trim();

    if (!trimmed) {
      toast.error(t("validation.user_id_required"));
      return;
    }

    if (!UUID_REGEX.test(trimmed)) {
      toast.error(t("validation.uuid_invalid"));
      return;
    }

    startTransition(async () => {
      try {
        const response = await apiRequestFromClient<{ status: string; data: UserPermission[] }>(
          `/admin/rbac/users/${encodeURIComponent(trimmed)}/permissions`,
        );
        const permissions = response && typeof response === "object" && "data" in response
          ? (response as { data: UserPermission[] }).data
          : (response as unknown as UserPermission[]);
        setUserPermissions(permissions);
        setLoadedUserId(trimmed);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("errors.load_user_permissions_failed"),
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <div className="space-y-3">
          <Label htmlFor="user-id-input" className="text-sm font-medium">
            UUID del usuario
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="user-id-input"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                className="pl-8 font-mono text-sm"
              />
            </div>
            <Button onClick={handleSearch} disabled={isPending || !userIdInput.trim()}>
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Search className="mr-2 size-4" />
              )}
              Buscar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ingresá el UUID del usuario para ver y gestionar sus permisos directos.
            Podés obtenerlo desde la página de detalle del usuario.
          </p>
        </div>
      </div>

      {loadedUserId && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Mostrando permisos para:{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">{loadedUserId}</code>
          </p>
          <UserPermissionsPanel
            userId={loadedUserId}
            initialUserPermissions={userPermissions}
            allPermissions={allPermissions}
          />
        </div>
      )}
    </div>
  );
}
