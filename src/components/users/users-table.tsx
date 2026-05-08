import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
import { DataTableShell } from "@/components/shared/data-table-shell";

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

function getFullName(user: AdminUser): string {
  return (
    [user.name, user.paternal_last_name, user.maternal_last_name]
      .filter(Boolean)
      .join(" ") || "—"
  );
}

function LocationCell({ user }: { user: AdminUser }) {
  const union = user.union?.name;
  const localField = user.local_field?.name;
  if (!union && !localField) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="min-w-0">
      <p className="truncate text-xs">{union ?? "—"}</p>
      {localField && (
        <p className="truncate text-xs text-muted-foreground">{localField}</p>
      )}
    </div>
  );
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
  showAdministrativeCompletion?: boolean;
}

function UserMobileCard({
  user,
  showAdministrativeCompletion,
}: {
  user: AdminUser;
  showAdministrativeCompletion: boolean;
}) {
  const roleNames = extractRoleNames(user);
  const fullName = getFullName(user);
  const union = user.union?.name;
  const localField = user.local_field?.name;
  const location = [union, localField].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/dashboard/users/${user.user_id}`}
      className="block rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-3">
        <UserAvatar
          src={user.user_image}
          name={user.name}
          email={user.email}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {user.email ?? "—"}
          </p>
        </div>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge
          variant={user.active !== false ? "soft-success" : "outline"}
          className="text-xs"
        >
          {user.active !== false ? "Activo" : "Inactivo"}
        </Badge>
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
        {showAdministrativeCompletion && (
          <Badge
            variant={user.post_registration?.complete ? "default" : "outline"}
            className="text-xs"
          >
            {user.post_registration?.complete ? "Post-registro" : "Pendiente"}
          </Badge>
        )}
      </div>

      {roleNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {roleNames.map((role) => (
            <Badge key={role} variant="secondary" className="text-xs">
              {role}
            </Badge>
          ))}
        </div>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {location && (
          <div className="col-span-2">
            <dt className="text-muted-foreground">Ubicación</dt>
            <dd className="truncate">{location}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">Fecha de alta</dt>
          <dd>{formatDate(user.created_at)}</dd>
        </div>
      </dl>
    </Link>
  );
}

export function UsersTable({
  users,
  showAdministrativeCompletion = false,
}: UsersTableProps) {
  return (
    <>
      {/* Desktop: full table */}
      <div className="hidden md:block">
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Usuario</TableHead>
                <TableHead className="hidden md:table-cell">Roles</TableHead>
                <TableHead className="hidden lg:table-cell">Ubicación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden sm:table-cell">Accesos</TableHead>
                {showAdministrativeCompletion ? (
                  <TableHead className="hidden lg:table-cell">Post-registro</TableHead>
                ) : null}
                <TableHead className="hidden pr-6 md:table-cell">Fecha de alta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const roleNames = extractRoleNames(user);
                const fullName = getFullName(user);

                return (
                  <TableRow key={user.user_id}>
                    <TableCell className="pl-6">
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
                      <LocationCell user={user} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active !== false ? "soft-success" : "outline"} className="text-xs">
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
                    {showAdministrativeCompletion ? (
                      <TableCell className="hidden lg:table-cell">
                        <Badge
                          variant={user.post_registration?.complete ? "default" : "outline"}
                          className="text-xs"
                        >
                          {user.post_registration?.complete ? "Completo" : "Pendiente"}
                        </Badge>
                      </TableCell>
                    ) : null}
                    <TableCell className="hidden pr-6 text-xs text-muted-foreground md:table-cell">
                      {formatDate(user.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>

      {/* Mobile: descriptive cards */}
      <ul className="space-y-3 md:hidden" aria-label="Lista de usuarios">
        {users.map((user) => (
          <li key={user.user_id}>
            <UserMobileCard
              user={user}
              showAdministrativeCompletion={showAdministrativeCompletion}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
