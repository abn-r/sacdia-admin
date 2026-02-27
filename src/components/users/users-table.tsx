import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/users/user-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminUser } from "@/lib/api/admin-users";

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (email?.[0] ?? "?").toUpperCase();
}

function extractRoleNames(user: AdminUser): string[] {
  const roles: string[] = [];
  if (user.roles) roles.push(...user.roles);
  if (user.users_roles) {
    for (const ur of user.users_roles) {
      if (ur.roles?.role_name) roles.push(ur.roles.role_name);
    }
  }
  return [...new Set(roles)];
}

function formatLocation(user: AdminUser): string {
  const parts = [
    user.country?.name,
    user.union?.name,
    user.local_field?.name,
  ].filter(Boolean);
  return parts.join(" / ") || "—";
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

interface UsersTableProps {
  users: AdminUser[];
}

export function UsersTable({ users }: UsersTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead className="hidden md:table-cell">Roles</TableHead>
            <TableHead className="hidden lg:table-cell">Ubicación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="hidden sm:table-cell">Accesos</TableHead>
            <TableHead className="hidden lg:table-cell">Post-registro</TableHead>
            <TableHead className="hidden md:table-cell">Fecha de alta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const roleNames = extractRoleNames(user);
            const fullName =
              [user.name, user.paternal_last_name, user.maternal_last_name]
                .filter(Boolean)
                .join(" ") || "—";

            return (
              <TableRow key={user.user_id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={user.user_image}
                      name={user.name}
                      email={user.email}
                      size={32}
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/users/${user.user_id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {fullName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email ?? "—"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {roleNames.length > 0 ? (
                      roleNames.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin rol</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden max-w-[200px] lg:table-cell">
                  <span className="truncate text-xs text-muted-foreground" title={formatLocation(user)}>
                    {formatLocation(user)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={user.active !== false ? "default" : "outline"} className="text-xs">
                    {user.active !== false ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex gap-1">
                    <Badge
                      variant={user.access_app ? "default" : "outline"}
                      className="text-xs"
                    >
                      App
                    </Badge>
                    <Badge
                      variant={user.access_panel ? "default" : "outline"}
                      className="text-xs"
                    >
                      Panel
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge
                    variant={user.post_registration?.complete ? "default" : "outline"}
                    className="text-xs"
                  >
                    {user.post_registration?.complete ? "Completo" : "Pendiente"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                  {formatDate(user.created_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
