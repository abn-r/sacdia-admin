import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { UserApprovalActions } from "@/components/users/user-approval-actions";
import { UserAvatar } from "@/components/users/user-avatar";
import { UserAccessToggles } from "@/components/users/user-access-toggles";
import { normalizeApprovalStatus } from "@/lib/admin-users/approval-status";
import { PostRegistrationTab } from "@/components/users/post-registration-tab";
import { MfaTab } from "@/components/users/mfa-tab";
import { SessionsTab } from "@/components/users/sessions-tab";
import { UserPermissionsPanel } from "@/components/rbac/user-permissions-panel";
import { UserRolesPanel } from "@/components/rbac/user-roles-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAdminUserDetail,
  type AdminUserDetail,
} from "@/lib/api/admin-users";
import { ApiError } from "@/lib/api/client";
import {
  canManageAdministrativeCompletion,
  canReadSensitiveUserFamily,
  canViewAdministrativeCompletion,
  hasAnyPermission,
} from "@/lib/auth/permission-utils";
import { getAdminUserMfaStatus } from "@/lib/api/mfa";
import { USERS_UPDATE } from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import {
  getUserPermissions,
  getUserRoles,
  listPermissions,
  listRoles,
} from "@/lib/rbac/service";
import {
  getPostRegistrationStatus,
  getPostRegistrationPhotoStatus,
  type PostRegistrationStatus,
  type PhotoStatusResponse,
} from "@/lib/api/post-registration";
import {
  getAdminUserSessions,
  type AdminSessionListData,
} from "@/lib/api/sessions";
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

type EmergencyContact = {
  emergency_id?: number | null;
  name?: string | null;
  phone?: string | null;
  primary?: boolean | null;
  relationship_type_id?: number | null;
  [key: string]: unknown;
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

const BLOOD_TYPE_LABELS: Record<string, string> = {
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
};

function formatBloodType(raw?: string | null): string {
  if (raw === null || raw === undefined || raw.trim() === "") return "No especificado";
  return BLOOD_TYPE_LABELS[raw] ?? raw;
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
  let postRegistrationStatus: PostRegistrationStatus | null = null;
  let photoStatus: PhotoStatusResponse | null = null;
  let sessionsData: AdminSessionListData | null = null;

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

  // Fetch post-registration data separately so failures don't block the whole page
  const canSeeAdministrativeCompletionEarly = canViewAdministrativeCompletion(currentUser);
  if (canSeeAdministrativeCompletionEarly) {
    const [prStatus, prPhotoStatus] = await Promise.all([
      getPostRegistrationStatus(userId).catch(() => null),
      getPostRegistrationPhotoStatus(userId).catch(() => null),
    ]);
    postRegistrationStatus = prStatus;
    photoStatus = prPhotoStatus;
  }

  // Fetch MFA status — returns null when backend admin endpoint is not yet available
  const mfaStatus = await getAdminUserMfaStatus(userId).catch(() => null);
  const canManageMfa = hasAnyPermission(currentUser, [USERS_UPDATE]);

  // Fetch sessions for the target user via the admin-scoped endpoint.
  sessionsData = await getAdminUserSessions(userId).catch(() => null);

  const canSeeHealthData = canReadSensitiveUserFamily(currentUser, "health");
  const canSeeEmergencyContacts = canReadSensitiveUserFamily(
    currentUser,
    "emergency_contacts",
  );
  const canSeeLegalRepresentative = canReadSensitiveUserFamily(
    currentUser,
    "legal_representative",
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

      {/* Identity card — always visible */}
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

      {/* Tabbed content */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informacion</TabsTrigger>
          {canSeeAdministrativeCompletion ? (
            <TabsTrigger value="post-registration">Post-registro</TabsTrigger>
          ) : null}
          {/* <TabsTrigger value="seguridad">Seguridad</TabsTrigger> */}
          {/* <TabsTrigger value="sesiones">Sesiones</TabsTrigger> */}
        </TabsList>

        {/* ── Tab 1: User detail ── */}
        <TabsContent value="info" className="mt-4">
          <div className="space-y-6">
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
                  <InfoRow label="Genero" value={user.gender} />
                  <InfoRow
                    label="Bautismo"
                    value={
                      user.baptism !== null && user.baptism !== undefined
                        ? user.baptism
                          ? `Si${user.baptism_date ? ` (${formatDate(user.baptism_date)})` : ""}`
                          : "No"
                        : "—"
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ubicacion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Pais" value={user.country?.name} />
                  <InfoRow label="Union" value={user.union?.name} />
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
                        <InfoRow label="Tipo de sangre" value={formatBloodType(user.health.blood)} />
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
                        Este payload no incluyo el bloque sensible de salud.
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
                  <CardContent>
                    {!user.emergency_contacts ? (
                      <p className="text-sm text-muted-foreground">
                        Este payload no incluyo el bloque de contactos de emergencia.
                      </p>
                    ) : user.emergency_contacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Sin contactos de emergencia registrados.
                      </p>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Telefono</TableHead>
                              <TableHead>Parentesco ID</TableHead>
                              <TableHead>Principal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(user.emergency_contacts as EmergencyContact[]).map((contact, index) => (
                              <TableRow key={contact.emergency_id ?? index}>
                                <TableCell className="font-medium">
                                  {contact.name ?? "—"}
                                </TableCell>
                                <TableCell>{contact.phone ?? "—"}</TableCell>
                                <TableCell>
                                  {contact.relationship_type_id != null
                                    ? `#${contact.relationship_type_id}`
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  {contact.primary ? (
                                    <Badge variant="secondary" className="text-xs">
                                      Principal
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">No</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
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
                        <InfoRow label="Telefono" value={legalRepresentative.phone} />
                        <InfoRow
                          label="Tipo de relacion"
                          value={legalRepresentative.relationshipTypeId}
                        />
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Este payload no incluyo el bloque de representante legal.
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
                    label="Ultima actualizacion"
                    value={formatDate(user.updated_at ?? user.modified_at)}
                  />
                </CardContent>
              </Card>
            </div>

            {/* <Card>
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
            </Card> */}

            {/* <UserPermissionsPanel
              userId={userId}
              initialUserPermissions={userPermissions}
              allPermissions={allPermissions}
            /> */}

            {/* {user.club_assignments &&
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
              )} */}
          </div>
        </TabsContent>

        {/* ── Tab 2: Post-registration monitor ── */}
        {canSeeAdministrativeCompletion ? (
          <TabsContent value="post-registration" className="mt-4">
            {postRegistrationStatus && photoStatus ? (
              <PostRegistrationTab
                userId={userId}
                status={postRegistrationStatus}
                photoStatus={photoStatus}
                canOverride={canUpdateAdministrativeCompletion}
              />
            ) : (
              <Card>
                <CardContent className="py-6">
                  <p className="text-center text-sm text-muted-foreground">
                    No se pudo obtener el estado del post-registro. El usuario puede no haber iniciado el proceso o puede haber un error de conectividad.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ) : null}

        {/* ── Tab 3: Security / MFA ── */}
        <TabsContent value="seguridad" className="mt-4">
          <MfaTab
            userId={userId}
            mfaEnabled={mfaStatus?.enabled ?? null}
            canManageMfa={canManageMfa}
          />
        </TabsContent>

        {/* ── Tab 4: Sessions ── */}
        <TabsContent value="sesiones" className="mt-4">
          <SessionsTab userId={userId} initialData={sessionsData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
