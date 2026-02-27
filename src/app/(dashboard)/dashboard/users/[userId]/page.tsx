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
import { getAdminUserDetail, type AdminUserDetail } from "@/lib/api/admin-users";
import { requireAdminUser } from "@/lib/auth/session";

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
  if (Array.isArray((user as Record<string, unknown>).permissions)) {
    perms.push(...((user as Record<string, unknown>).permissions as string[]));
  }
  if (user.users_roles) {
    for (const ur of user.users_roles) {
      const role = ur.roles as Record<string, unknown> | null;
      if (role && Array.isArray(role.role_permissions)) {
        for (const rp of role.role_permissions as Array<Record<string, unknown>>) {
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
  instance?: { name?: string; instance_type?: string } | null;
  role?: { role_name?: string } | null;
  role_name?: string;
  club_name?: string;
  instance_type?: string;
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-[160px] text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  );
}

export default async function UserDetailPage({ params }: { params: Params }) {
  await requireAdminUser();
  const { userId } = await params;

  let user: AdminUserDetail;
  try {
    user = await getAdminUserDetail(userId);
  } catch {
    notFound();
  }

  const fullName = [user.name, user.paternal_last_name, user.maternal_last_name]
    .filter(Boolean)
    .join(" ") || user.email || "Usuario";
  const roleNames = extractRoleNames(user);

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
                <Badge key={role} variant="secondary">{role}</Badge>
              ))}
            </div>
            <div className="mt-2">
              <UserApprovalActions userId={user.user_id} currentApproval={user.approval} />
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
            <InfoRow label="Fecha de nacimiento" value={formatDate(user.birthday)} />
            <InfoRow label="Género" value={user.gender} />
            <InfoRow label="Tipo de sangre" value={user.blood} />
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accesos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Acceso a App"
              value={
                <Badge variant={user.access_app ? "default" : "outline"}>
                  {user.access_app ? "Sí" : "No"}
                </Badge>
              }
            />
            <InfoRow
              label="Acceso a Panel"
              value={
                <Badge variant={user.access_panel ? "default" : "outline"}>
                  {user.access_panel ? "Sí" : "No"}
                </Badge>
              }
            />
            <InfoRow
              label="Aprobación"
              value={String(user.approval ?? "—")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Post-registro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Completado"
              value={
                <Badge variant={user.post_registration?.complete ? "default" : "outline"}>
                  {user.post_registration?.complete ? "Completo" : "Pendiente"}
                </Badge>
              }
            />
            <InfoRow
              label="Foto de perfil"
              value={user.post_registration?.profile_picture_complete ? "Sí" : "No"}
            />
            <InfoRow
              label="Info personal"
              value={user.post_registration?.personal_info_complete ? "Sí" : "No"}
            />
            <InfoRow
              label="Selección de club"
              value={user.post_registration?.club_selection_complete ? "Sí" : "No"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roles globales</CardTitle>
          </CardHeader>
          <CardContent>
            {roleNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {roleNames.map((role) => (
                  <Badge key={role} variant="secondary">{role}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin roles globales asignados.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scope y metadatos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.scope && (
              <>
                <InfoRow label="Tipo de scope" value={user.scope.type} />
                <InfoRow label="Union ID (scope)" value={user.scope.union_id} />
                <InfoRow label="Campo Local ID (scope)" value={user.scope.local_field_id} />
                <Separator className="my-2" />
              </>
            )}
            <InfoRow label="Fecha de registro" value={formatDate(user.created_at)} />
            <InfoRow label="Última actualización" value={formatDate(user.updated_at ?? user.modified_at)} />
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
              return <p className="text-sm text-muted-foreground">Sin permisos asignados (o se resuelven desde roles).</p>;
            }
            return (
              <div className="flex flex-wrap gap-1">
                {perms.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs font-mono">{p}</Badge>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {user.club_assignments && (user.club_assignments as ClubAssignment[]).length > 0 && (
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
                    <th className="px-4 py-2 text-left font-medium">Instancia</th>
                    <th className="px-4 py-2 text-left font-medium">Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {(user.club_assignments as ClubAssignment[]).map((ca, idx) => (
                    <tr key={ca.club_role_assignment_id ?? idx} className="border-b last:border-b-0">
                      <td className="px-4 py-2">{ca.club?.name ?? ca.club_name ?? "—"}</td>
                      <td className="px-4 py-2">
                        {ca.instance?.name ?? ca.instance?.instance_type ?? ca.instance_type ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="secondary" className="text-xs">
                          {ca.role?.role_name ?? ca.role_name ?? "—"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
