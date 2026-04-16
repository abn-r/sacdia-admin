"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Pencil,
  Power,
  Search,
  AlertTriangle,
  UserX,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { deactivateRoleAction } from "@/lib/rbac/actions";
import type { Role } from "@/lib/rbac/types";

// ─── Alert component — may not exist yet, using inline div fallback ──────────
// The admin uses a generic Alert from shadcn. We check for it and fallback gracefully.
function ReadOnlyAlert() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 p-4 text-sm">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-info" />
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Vista de solo lectura.</span>{" "}
        Contacta un super_admin para crear o modificar roles.
      </p>
    </div>
  );
}

// ─── Permissions popover ─────────────────────────────────────────────────────
function PermissionsPopover({ role }: { role: Role }) {
  const permCount = role.role_permissions?.length ?? 0;

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const rp of role.role_permissions ?? []) {
      const name = rp.permissions?.permission_name ?? rp.permission_id;
      const resource = name.split(":")[0] ?? "other";
      if (!map.has(resource)) map.set(resource, []);
      map.get(resource)!.push(name);
    }
    return map;
  }, [role.role_permissions]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-pointer focus-visible:outline-none"
          aria-label={`Ver los ${permCount} permisos de ${role.role_name}`}
        >
          <Badge variant="secondary" className="tabular-nums">
            {permCount} permisos
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        {permCount === 0 ? (
          <p className="text-sm text-muted-foreground">Sin permisos asignados.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {permCount} permisos asignados
            </p>
            {Array.from(grouped.entries()).map(([resource, perms]) => (
              <div key={resource} className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {resource}
                </p>
                <div className="flex flex-wrap gap-1">
                  {perms.map((p) => (
                    <code
                      key={p}
                      className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground"
                    >
                      {p}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Deactivate AlertDialog ──────────────────────────────────────────────────
interface DeactivateDialogProps {
  role: Role;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function parseUsersCount(errorMessage: string): number | null {
  // Backend message format: "Cannot deactivate role: N users are currently assigned..."
  const match = /(\d+)\s+user/i.exec(errorMessage);
  return match ? parseInt(match[1], 10) : null;
}

function DeactivateDialog({ role, open, onClose, onSuccess }: DeactivateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [blockError, setBlockError] = useState<{ usersCount: number } | null>(null);

  const handleDeactivate = async () => {
    setLoading(true);
    setBlockError(null);
    try {
      const result = await deactivateRoleAction(role.role_id);
      if (result.error) {
        const count = parseUsersCount(result.error);
        if (count !== null) {
          setBlockError({ usersCount: count });
        } else {
          toast.error(result.error);
          onClose();
        }
      } else {
        toast.success(`Rol "${role.role_name}" desactivado correctamente.`);
        onSuccess();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = blockError !== null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setBlockError(null);
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className={isBlocked ? "bg-warning/10" : "bg-destructive/10"}>
            {isBlocked ? (
              <UserX className="size-8 text-warning" />
            ) : (
              <AlertTriangle className="size-8 text-destructive" />
            )}
          </AlertDialogMedia>
          <AlertDialogTitle>
            {isBlocked
              ? `No se puede desactivar "${role.role_name}"`
              : `¿Desactivar el rol "${role.role_name}"?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked ? (
              <>
                Este rol está asignado a{" "}
                <strong className="text-foreground">{blockError.usersCount} usuario{blockError.usersCount !== 1 ? "s" : ""}</strong>.
                Para desactivarlo, primero reasigna esos usuarios a otro rol.
              </>
            ) : (
              "El rol no se eliminará, pero dejará de estar disponible para asignar. Puedes reactivarlo después."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setBlockError(null); onClose(); }}>
            {isBlocked ? "Cerrar" : "Cancelar"}
          </AlertDialogCancel>
          {isBlocked ? (
            <Button variant="outline" asChild>
              <Link href="/dashboard/rbac/user-permissions">
                <Users className="mr-2 size-4" />
                Ver usuarios asignados
              </Link>
            </Button>
          ) : (
            <AlertDialogAction
              variant="destructive"
              disabled={loading}
              onClick={(e) => {
                e.preventDefault();
                void handleDeactivate();
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Desactivar"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main roles table ────────────────────────────────────────────────────────
type ActiveFilter = "true" | "false" | "all";

interface RolesTableProps {
  roles: Role[];
  isSuperAdmin: boolean;
}

export function RolesTable({ roles, isSuperAdmin }: RolesTableProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveFilter>("true");
  const [deactivateTarget, setDeactivateTarget] = useState<Role | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    const byStatus = roles.filter((r) => {
      if (activeTab === "true") return r.active !== false;
      if (activeTab === "false") return r.active === false;
      return true;
    });

    if (!search.trim()) return byStatus;

    const q = search.toLowerCase();
    return byStatus.filter(
      (r) =>
        r.role_name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    );
  }, [roles, activeTab, search]);

  const isProtected = (role: Role) => role.role_name === "super_admin";

  return (
    <div className="space-y-5">
      {!isSuperAdmin && <ReadOnlyAlert />}

      {/* Search + Tabs toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ActiveFilter)}
        >
          <TabsList variant="line">
            <TabsTrigger value="true">Activos</TabsTrigger>
            <TabsTrigger value="false">Inactivos</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative max-w-xs w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={search ? `Sin resultados para "${search}"` : "Sin roles"}
          description={
            search
              ? "Intenta con otro término de búsqueda."
              : activeTab === "false"
                ? "No hay roles inactivos."
                : "No se encontraron roles registrados."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Nombre
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Categoría
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Descripción
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Permisos
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Estado
                </TableHead>
                {isSuperAdmin && (
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                    Acciones
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((role, index) => {
                const protected_ = isProtected(role);
                return (
                  <TableRow
                    key={role.role_id}
                    className="transition-colors hover:bg-muted/30 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${index * 40}ms`, animationFillMode: "backwards" }}
                  >
                    {/* role_name — mono, lock icon for super_admin */}
                    <TableCell className="px-3 py-2.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        {protected_ && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>Rol protegido del sistema</TooltipContent>
                          </Tooltip>
                        )}
                        <span className="font-mono text-sm font-medium">{role.role_name}</span>
                      </div>
                    </TableCell>

                    {/* role_category badge */}
                    <TableCell className="px-3 py-2.5 align-middle">
                      <Badge variant={role.role_category === "GLOBAL" ? "secondary" : "outline"}>
                        {role.role_category}
                      </Badge>
                    </TableCell>

                    {/* description — truncated with tooltip */}
                    <TableCell className="px-3 py-2.5 align-middle hidden md:table-cell max-w-[260px]">
                      {role.description ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate text-sm text-muted-foreground cursor-default">
                              {role.description}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">{role.description}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* permissions count with popover */}
                    <TableCell className="px-3 py-2.5 align-middle">
                      <PermissionsPopover role={role} />
                    </TableCell>

                    {/* active status */}
                    <TableCell className="px-3 py-2.5 align-middle">
                      <Badge variant={role.active !== false ? "soft-success" : "outline"}>
                        {role.active !== false ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>

                    {/* actions — super_admin only */}
                    {isSuperAdmin && (
                      <TableCell className="px-3 py-2.5 align-middle text-right">
                        <div className="flex items-center justify-end gap-1">
                          {protected_ ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 opacity-40"
                                    disabled
                                    aria-label="Editar rol protegido"
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Rol protegido — no se puede modificar desde la UI</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  asChild
                                >
                                  <Link href={`/dashboard/rbac/roles/${role.role_id}`}>
                                    <Pencil className="size-3.5" />
                                    <span className="sr-only">Editar {role.role_name}</span>
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar rol</TooltipContent>
                            </Tooltip>
                          )}

                          {protected_ ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 opacity-40"
                                    disabled
                                    aria-label="Desactivar rol protegido"
                                  >
                                    <Power className="size-3.5" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Rol protegido — no se puede modificar desde la UI</TooltipContent>
                            </Tooltip>
                          ) : role.active !== false ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeactivateTarget(role)}
                                  aria-label={`Desactivar ${role.role_name}`}
                                >
                                  <Power className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Desactivar rol</TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer count */}
      <p className="text-sm text-muted-foreground">
        Mostrando{" "}
        <span className="font-medium text-foreground">{filtered.length}</span> de{" "}
        <span className="font-medium text-foreground">{roles.length}</span> roles
      </p>

      {/* Deactivate AlertDialog */}
      {deactivateTarget && (
        <DeactivateDialog
          role={deactivateTarget}
          open={!!deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
