"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Lock,
  Loader2,
  Save,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PermissionPicker } from "@/components/rbac/permission-picker";
import { createRoleAction, updateRoleAction } from "@/lib/rbac/actions";
import type { Permission, Role, RbacActionState } from "@/lib/rbac/types";

const ROLES_PATH = "/dashboard/rbac/roles";
const MAX_DESCRIPTION = 500;

// ─── Create form ─────────────────────────────────────────────────────────────
interface CreateRoleFormProps {
  allPermissions: Permission[];
}

export function CreateRoleForm({ allPermissions }: CreateRoleFormProps) {
  const [isPending, startTransition] = useTransition();

  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [roleCategory, setRoleCategory] = useState<"GLOBAL" | "CLUB">("GLOBAL");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Client-side validation mirrors server-side
  function validate(): string | null {
    if (!roleName.trim()) return "El nombre del rol es obligatorio";
    if (!/^[a-z_]{3,64}$/.test(roleName.trim())) {
      return "El nombre debe tener entre 3 y 64 caracteres en minúsculas (solo letras y guiones bajos)";
    }
    if (roleName.trim() === "super_admin") {
      return "No se puede crear un rol con el nombre 'super_admin'";
    }
    if (description.trim().length < 10) {
      return "La descripción debe tener al menos 10 caracteres";
    }
    if (description.trim().length > MAX_DESCRIPTION) {
      return `La descripción no puede superar los ${MAX_DESCRIPTION} caracteres`;
    }
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set("role_name", roleName.trim());
    formData.set("description", description.trim());
    formData.set("role_category", roleCategory);
    formData.set("permission_ids", Array.from(selectedPerms).join(","));

    startTransition(async () => {
      // Server action returns an error state or redirects on success.
      // Next.js handles the server-side redirect automatically.
      const result = await createRoleAction({} as RbacActionState, formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}

      {/* Card: General info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información general</CardTitle>
          <CardDescription>
            Define el nombre, categoría y propósito de este rol.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* role_name */}
          <div className="space-y-2">
            <Label htmlFor="role_name">
              Nombre del rol <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="role_name"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="ej: club_director"
              pattern="^[a-z_]{3,64}$"
              title="Solo minúsculas y guiones bajos, entre 3 y 64 caracteres"
              autoComplete="off"
              required
            />
            <p className="text-xs text-muted-foreground">
              Formato: solo letras minúsculas y guiones bajos (<code className="font-mono">a-z_</code>). Este identificador es inmutable una vez creado.
            </p>
          </div>

          {/* role_category */}
          <div className="space-y-2">
            <Label htmlFor="role_category">
              Categoría <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              value={roleCategory}
              onValueChange={(v) => setRoleCategory(v as "GLOBAL" | "CLUB")}
            >
              <SelectTrigger id="role_category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLOBAL">GLOBAL — aplica en toda la plataforma</SelectItem>
                <SelectItem value="CLUB">CLUB — aplica dentro de un club específico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">
                Descripción <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <span
                className={`text-xs tabular-nums ${
                  description.length > MAX_DESCRIPTION
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {description.length}/{MAX_DESCRIPTION}
              </span>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica el propósito del rol y qué tipo de usuarios deberían tenerlo."
              className="min-h-[100px] resize-none"
              minLength={10}
              maxLength={MAX_DESCRIPTION}
              required
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 10 caracteres. Explica el propósito del rol y qué tipo de usuarios deberían tenerlo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card: Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permisos</CardTitle>
          <CardDescription>
            Asigna los permisos que tendrá este rol. Se pueden modificar después.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionPicker
            permissions={allPermissions}
            selected={selectedPerms}
            onChange={setSelectedPerms}
          />
        </CardContent>
      </Card>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-10 -mx-6 border-t border-border bg-background/95 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={ROLES_PATH}>
              <ArrowLeft className="mr-2 size-4" />
              Cancelar
            </Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Crear rol
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────
interface EditRoleFormProps {
  role: Role;
  allPermissions: Permission[];
}

export function EditRoleForm({ role, allPermissions }: EditRoleFormProps) {
  const [isPending, startTransition] = useTransition();

  const initialSelectedIds = new Set(
    role.role_permissions?.map((rp) => rp.permission_id) ?? [],
  );

  const [description, setDescription] = useState(role.description ?? "");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(initialSelectedIds);
  const [error, setError] = useState<string | null>(null);

  // Groups that have selected permissions — auto-open in edit mode
  const defaultOpenGroups = new Set(
    Array.from(initialSelectedIds).flatMap((pid) => {
      const perm = allPermissions.find((p) => p.permission_id === pid);
      if (!perm) return [];
      return [perm.permission_name.split(":")[0] ?? "other"];
    }),
  );

  function validate(): string | null {
    if (description.trim().length < 10) {
      return "La descripción debe tener al menos 10 caracteres";
    }
    if (description.trim().length > MAX_DESCRIPTION) {
      return `La descripción no puede superar los ${MAX_DESCRIPTION} caracteres`;
    }
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set("description", description.trim());
    formData.set("permission_ids", Array.from(selectedPerms).join(","));

    const boundAction = updateRoleAction.bind(null, role.role_id);

    startTransition(async () => {
      const result = await boundAction({} as RbacActionState, formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}

      {/* Card: General info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información general</CardTitle>
          <CardDescription>
            El nombre y la categoría del rol son inmutables tras la creación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* role_name — static, immutable */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Nombre del rol</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="size-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px] text-center">
                  El nombre del rol es inmutable. Crea uno nuevo si necesitas cambiarlo.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3">
              <span className="font-mono text-sm text-foreground">{role.role_name}</span>
            </div>
          </div>

          {/* role_category — static, immutable */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Categoría</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="size-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>La categoría es inmutable tras la creación.</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3">
              <span className="text-sm text-foreground">{role.role_category}</span>
            </div>
          </div>

          {/* description — editable */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">
                Descripción <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <span
                className={`text-xs tabular-nums ${
                  description.length > MAX_DESCRIPTION
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {description.length}/{MAX_DESCRIPTION}
              </span>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica el propósito del rol y qué tipo de usuarios deberían tenerlo."
              className="min-h-[100px] resize-none"
              minLength={10}
              maxLength={MAX_DESCRIPTION}
              required
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 10 caracteres. Explica el propósito del rol y qué tipo de usuarios deberían tenerlo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card: Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permisos</CardTitle>
          <CardDescription>
            Al guardar se sincronizarán los permisos — los que no estén en la selección serán removidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionPicker
            permissions={allPermissions}
            selected={selectedPerms}
            onChange={setSelectedPerms}
            defaultOpenGroups={defaultOpenGroups}
          />
        </CardContent>
      </Card>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-10 -mx-6 border-t border-border bg-background/95 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={ROLES_PATH}>
              <ArrowLeft className="mr-2 size-4" />
              Cancelar
            </Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
