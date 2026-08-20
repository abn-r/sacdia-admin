"use client";

import { useState, useTransition } from "react";
import { Search, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequestFromClient } from "@/lib/api/client";
import {
  listAdminUsers,
  type AdminUser,
} from "@/lib/api/admin-users";
import {
  getAdminUserDisplayName,
  getAdminUserSecondaryLabel,
} from "@/lib/admin-users/display";
import { UserPermissionsPanel } from "@/components/rbac/user-permissions-panel";
import type { Permission, UserPermission } from "@/lib/rbac/types";

interface UserPermissionsSearchProps {
  allPermissions: Permission[];
}

function userDisplayName(user: AdminUser) {
  return getAdminUserDisplayName(user, {
    deletedAccount: "Cuenta eliminada",
    fallback: "Usuario sin nombre",
  });
}

function userSecondaryLabel(user: AdminUser) {
  return getAdminUserSecondaryLabel(user, {
    anonymized: "Datos anonimizados",
    fallback: "Sin correo",
  });
}

export function UserPermissionsSearch({ allPermissions }: UserPermissionsSearchProps) {
  const t = useTranslations("rbac");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isSearching, startSearchTransition] = useTransition();

  function loadUserPermissions(user: AdminUser) {
    const userId = user.user_id;

    if (!userId) {
      toast.error("No se pudo identificar al usuario seleccionado.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await apiRequestFromClient<{ status: string; data: UserPermission[] }>(
          `/admin/rbac/users/${encodeURIComponent(userId)}/permissions`,
        );
        const permissions = response && typeof response === "object" && "data" in response
          ? (response as { data: UserPermission[] }).data
          : (response as unknown as UserPermission[]);
        setUserPermissions(permissions);
        setLoadedUserId(userId);
        setSelectedUser(user);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("errors.load_user_permissions_failed"),
        );
      }
    });
  }

  function handleSearch() {
    const trimmed = query.trim();

    if (!trimmed) {
      toast.error("Ingresa un nombre o correo para buscar.");
      return;
    }

    startSearchTransition(async () => {
      try {
        const result = await listAdminUsers({
          search: trimmed,
          page: 1,
          limit: 10,
        });
        setResults(result.items);

        if (!result.endpointAvailable) {
          toast.error(result.endpointDetail);
        } else if (result.items.length === 0) {
          toast.info("No se encontraron usuarios con esa búsqueda.");
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudieron buscar usuarios.",
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <div className="space-y-3">
          <Label htmlFor="user-search-input" className="text-sm font-medium">
            Usuario
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="user-search-input"
                placeholder="Buscar por nombre o correo..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                className="pl-8 text-sm"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
              {isSearching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Buscar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Busca y selecciona un usuario para ver y gestionar sus permisos directos.
          </p>
        </div>

        {results.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Resultados encontrados
            </p>
            <div className="divide-y rounded-md border">
              {results.map((user) => {
                const isSelected = user.user_id === selectedUser?.user_id;
                return (
                  <button
                    key={user.user_id}
                    type="button"
                    onClick={() => loadUserPermissions(user)}
                    disabled={isPending}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/50 disabled:opacity-60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {userDisplayName(user)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {userSecondaryLabel(user)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {isSelected ? "Seleccionado" : "Seleccionar"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {loadedUserId && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Mostrando permisos para{" "}
            <span className="font-medium text-foreground">
              {selectedUser ? userDisplayName(selectedUser) : "usuario seleccionado"}
            </span>
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
