import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import { UserApprovalActions } from "@/components/users/user-approval-actions";
import { UserAvatar } from "@/components/users/user-avatar";
import {
  UserAccessToggles,
  normalizeApprovalStatus,
} from "@/components/users/user-access-toggles";
import { UserPermissionsPanel } from "@/components/rbac/user-permissions-panel";
import { UserRolesPanel } from "@/components/rbac/user-roles-panel";
import {
  getAdminUserDetail,
  type AdminUserDetail,
} from "@/lib/api/admin-users";
import { ApiError } from "@/lib/api/client";
import {
  canManageAdministrativeCompletion,
  canReadSensitiveUserFamily,
  canViewAdministrativeCompletion,
} from "@/lib/auth/permission-utils";
import { requireAdminUser } from "@/lib/auth/session";
import {
  getUserPermissions,
  getUserRoles,
  listPermissions,
  listRoles,
} from "@/lib/rbac/service";
import type { UserPermission, Permission, UserRole, Role } from "@/lib/rbac/types";

type Params = Promise<{ userId: string }>;

function extractRoleNames(user: AdminUserDetail): string[] {
  const roles: string[] = [];
  if (user.roles) roles.push(...user.roles);
  if (user.users_roles) {
    for (const ur of user.users_roles) {
      if (ur.roles?.role_name) roles.push(ur.roles.role_name);
    }
  }
  return [...new Set(roles)];
}

function extractPermissions(user: AdminUserDetail): string[] {
  const perms: string[] = [];

  const authorization = (user as Record<string, unknown>).authorization;
  const canonicalPermissions =
    authorization &&
    typeof authorization === "object" &&
    !Array.isArray(authorization)
      ? (authorization as { effective?: { permissions?: unknown } }).effective
          ?.permissions
      : undefined;
  if (Array.isArray(canonicalPermissions) && canonicalPermissions.length > 0) {
    return [
      ...new Set(canonicalPermissions.map((permission) => String(permission))),
    ].sort();
  }

  if (Array.isArray((user as Record<string, unknown>).permissions)) {
    perms.push(...((user as Record<string, unknown>).permissions as string[]));
  }
  if (user.users_roles) {
    for (const ur of user.users_roles) {
      const role = ur.roles as Record<string, unknown> | null;
      if (role && Array.isArray(role.role_permissions)) {
        for (const rp of role.role_permissions as Array<
          Record<string, unknown>
        >) {
          const perm = rp.permissions as Record<string, unknown> | undefined;
          if (perm?.permission_name) perms.push(String(perm.permission_name));
        }
      }
    }
  }
  return [...new Set(perms)].sort();
}

type ClubAssignment = {
  club_role_assignment_id?: number;
  club?: { name?: string; club_id?: number } | null;
  section?: { name?: string; club_type?: { name?: string } | null } | null;
  role?: { role_name?: string } | null;
  role_name?: string;
  club_name?: string;
  section_name?: string;
  [key: string]: unknown;
};

type HealthItem = {
  name?: string | null;
};

type LegalRepresentative = {
  name?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  phone?: string | null;
  relationship_type_id?: number | null;
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-[160px] text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  );
}

function formatNames(items: unknown[] | undefined) {
  if (!Array.isArray(items) || items.length === 0) {
    return "—";
  }

  const names = items
    .map((item) => (item as HealthItem | null)?.name?.trim())
    .filter((value): value is string => Boolean(value));

  return names.length > 0 ? names.join(", ") : "—";
}

function formatLegalRepresentative(value: Record<string, unknown> | null | undefined) {
  if (!value) {
    return null;
  }

  const representative = value as LegalRepresentative;
  const fullName = [
    representative.name,
    representative.paternal_last_name,
    representative.maternal_last_name,
  ]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ");

  return {
    fullName: fullName || "—",
    phone: representative.phone ?? "—",
    relationshipTypeId: representative.relationship_type_id ?? "—",
  };
}

export default async function UserDetailPage({ params }: { params: Params }) {
  const currentUser = await requireAdminUser();
  const { userId } = await params;

  let user: AdminUserDetail;
  let userPermissions: UserPermission[] = [];
  let allPermissions: Permission[] = [];
  let userRoles: UserRole[] = [];
  let allRoles: Role[] = [];

  try {
    const results = await Promise.all([
      getAdminUserDetail(userId),
      getUserPermissions(userId).catch(() => [] as UserPermission[]),
      listPermissions().catch(() => [] as Permission[]),
      getUserRoles(userId).catch(() => [] as UserRole[]),
      listRoles().catch(() => [] as Role[]),
    ]);
    user = results[0];
    userPermissions = results[1];
    allPermissions = results[2];
    userRoles = results[3];
    allRoles = results[4];
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acceso restringido</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Necesitas autorizacion global resuelta para consultar datos de terceros.
          </CardContent>
        </Card>
      );
    }

    notFound();
  }

  const canSeeHealthData = canReadSensitiveUserFamily(currentUser, "health");
  const canSeeEmergencyContacts = canReadSensitiveUserFamily(
    currentUser,
    "emergency_contacts",
  );
  const canSeeLegalRepresentative = canReadSensitiveUserFamily(
    currentUser,
    "legal_representative",
  );
  const canSeePostRegistrationDetail = canReadSensitiveUserFamily(
    currentUser,
    "post_registration",
  );
  const canSeeAdministrativeCompletion =
    canViewAdministrativeCompletion(currentUser);
  const canUpdateAdministrativeCompletion =
    canManageAdministrativeCompletion(currentUser);
  const fullName =
    [user.name, user.paternal_last_name, user.maternal_last_name]
      .filter(Boolean)
      .join(" ") ||
    user.email ||
    "Usuario";
  const roleNames = extractRoleNames(user);
  const legalRepresentative = formatLegalRepresentative(user.legal_representative);

  return (
    <div className="space-y-6">
      <PageHeader title="Detalle de usuario">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/users">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="flex items-center gap-4">
          <UserAvatar
            src={user.user_image}
            name={user.name}
            email={user.email}
            size={120}
          />
          <div>
            <h2 className="text-xl font-bold">{fullName}</h2>
            <p className="text-sm text-muted-foreground">{user.email ?? "—"}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant={user.active !== false ? "default" : "outline"}>
                {user.active !== false ? "Activo" : "Inactivo"}
              </Badge>
              {roleNames.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
            <div className="mt-2">
              {canUpdateAdministrativeCompletion ? (
                <UserApprovalActions
                  userId={user.user_id}
                  currentApproval={user.approval}
                />
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Nombre" value={user.name} />
            <InfoRow label="Apellido paterno" value={user.paternal_last_name} />
            <InfoRow label="Apellido materno" value={user.maternal_last_name} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow
              label="Fecha de nacimiento"
              value={formatDate(user.birthday)}
            />
            <InfoRow label="Género" value={user.gender} />
            <InfoRow
              label="Bautismo"
              value={
                user.baptism !== null && user.baptism !== undefined
                  ? user.baptism
                    ? `Sí${user.baptism_date ? ` (${formatDate(user.baptism_date)})` : ""}`
                    : "No"
                  : "—"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ubicación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="País" value={user.country?.name} />
            <InfoRow label="Unión" value={user.union?.name} />
            <InfoRow label="Campo local" value={user.local_field?.name} />
            <InfoRow label="Distrito ID" value={user.district_id} />
            <InfoRow label="Iglesia ID" value={user.church_id} />
          </CardContent>
        </Card>

        <UserAccessToggles
          userId={user.user_id}
          initialAccessApp={user.access_app}
          initialAccessPanel={user.access_panel}
          initialActive={user.active}
          initialApprovalStatus={normalizeApprovalStatus(user.approval)}
        />

        {canSeeHealthData ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Salud</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.health ? (
                <>
                  <InfoRow label="Tipo de sangre" value={user.health.blood} />
                  <InfoRow
                    label="Alergias"
                    value={formatNames(user.health.allergies)}
                  />
                  <InfoRow
                    label="Enfermedades"
                    value={formatNames(user.health.diseases)}
                  />
                  <InfoRow
                    label="Medicamentos"
                    value={formatNames(user.health.medicines)}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este payload no incluyó el bloque sensible de salud.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {canSeeEmergencyContacts ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contactos de emergencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.emergency_contacts ? (
                user.emergency_contacts.length > 0 ? (
                  user.emergency_contacts.map((contact, index) => (
                    <div key={index} className="rounded-md border p-3 text-sm">
                      <pre className="whitespace-pre-wrap font-sans text-sm">
                        {JSON.stringify(contact, null, 2)}
                      </pre>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sin contactos de emergencia registrados.
                  </p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este payload no incluyó el bloque de contactos de emergencia.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {canSeeLegalRepresentative ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Representante legal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {legalRepresentative ? (
                <>
                  <InfoRow label="Nombre" value={legalRepresentative.fullName} />
                  <InfoRow label="Teléfono" value={legalRepresentative.phone} />
                  <InfoRow
                    label="Tipo de relación"
                    value={legalRepresentative.relationshipTypeId}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este payload no incluyó el bloque de representante legal.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {canSeeAdministrativeCompletion ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Post-registro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canSeePostRegistrationDetail && user.post_registration ? (
                <>
                  <InfoRow
                    label="Completado"
                    value={
                      <Badge
                        variant={
                          user.post_registration.complete ? "default" : "outline"
                        }
                      >
                        {user.post_registration.complete ? "Completo" : "Pendiente"}
                      </Badge>
                    }
                  />
                  <InfoRow
                    label="Foto de perfil"
                    value={
                      user.post_registration.profile_picture_complete ? "Sí" : "No"
                    }
                  />
                  <InfoRow
                    label="Info personal"
                    value={
                      user.post_registration.personal_info_complete ? "Sí" : "No"
                    }
                  />
                  <InfoRow
                    label="Selección de club"
                    value={
                      user.post_registration.club_selection_complete ? "Sí" : "No"
                    }
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tu acceso actual solo permite completion administrativa mínima.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        <UserRolesPanel
          userId={userId}
          initialUserRoles={userRoles}
          allRoles={allRoles}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scope y metadatos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.scope && (
              <>
                <InfoRow label="Tipo de scope" value={user.scope.type} />
                <InfoRow label="Union ID (scope)" value={user.scope.union_id} />
                <InfoRow
                  label="Campo Local ID (scope)"
                  value={user.scope.local_field_id}
                />
                <Separator className="my-2" />
              </>
            )}
            <InfoRow
              label="Fecha de registro"
              value={formatDate(user.created_at)}
            />
            <InfoRow
              label="Última actualización"
              value={formatDate(user.updated_at ?? user.modified_at)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permisos efectivos</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const perms = extractPermissions(user);
            if (perms.length === 0) {
              return (
                <p className="text-sm text-muted-foreground">
                  Sin permisos asignados (o se resuelven desde roles).
                </p>
              );
            }
            return (
              <div className="flex flex-wrap gap-1">
                {perms.map((p) => (
                  <Badge
                    key={p}
                    variant="outline"
                    className="text-xs font-mono"
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <UserPermissionsPanel
        userId={userId}
        initialUserPermissions={userPermissions}
        allPermissions={allPermissions}
      />

      {user.club_assignments &&
        (user.club_assignments as ClubAssignment[]).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Roles de club</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Club</th>
                      <th className="px-4 py-2 text-left font-medium">
                        Seccion
                      </th>
                      <th className="px-4 py-2 text-left font-medium">Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(user.club_assignments as ClubAssignment[]).map(
                      (ca, idx) => (
                        <tr
                          key={ca.club_role_assignment_id ?? idx}
                          className="border-b last:border-b-0"
                        >
                          <td className="px-4 py-2">
                            {ca.club?.name ?? ca.club_name ?? "—"}
                          </td>
                          <td className="px-4 py-2">
                            {ca.section?.name ??
                              ca.section?.club_type?.name ??
                              ca.section_name ??
                              "—"}
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant="secondary" className="text-xs">
                              {ca.role?.role_name ?? ca.role_name ?? "—"}
                            </Badge>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
