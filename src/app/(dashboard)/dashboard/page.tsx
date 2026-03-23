import { Suspense } from "react";
import { Users, Building2, Tent, Award, GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { RoleDistributionChart, type RoleDistributionEntry } from "@/components/dashboard/role-distribution-chart";

type StatsData = {
  totalUsers: number | null;
  pendingUsers: number | null;
  activeClubs: number | null;
  totalClubs: number | null;
  activeCamporees: number | null;
  totalHonors: number | null;
  totalClasses: number | null;
};

type RecentUser = {
  user_id: string;
  email?: string | null;
  name?: string | null;
  paternal_last_name?: string | null;
  roles?: string[];
  users_roles?: Array<{ roles?: { role_name?: string | null } | null }>;
  active?: boolean;
  created_at?: string | null;
};

async function fetchStats(): Promise<StatsData> {
  const stats: StatsData = {
    totalUsers: null,
    pendingUsers: null,
    activeClubs: null,
    totalClubs: null,
    activeCamporees: null,
    totalHonors: null,
    totalClasses: null,
  };

  const fetchers = [
    async () => {
      try {
        const res = await apiRequest<{ data?: { meta?: { total?: number } }; meta?: { total?: number } }>("/admin/users?limit=1&page=1");
        stats.totalUsers = res?.data?.meta?.total ?? res?.meta?.total ?? null;
      } catch { /* endpoint unavailable */ }
    },
    async () => {
      try {
        const res = await apiRequest<{ data?: unknown[] } | unknown[]>("/clubs?status=active&limit=1");
        if (Array.isArray(res)) {
          stats.activeClubs = res.length;
        } else if (res?.data && Array.isArray(res.data)) {
          stats.activeClubs = res.data.length;
        }
      } catch { /* endpoint unavailable */ }
    },
    async () => {
      try {
        const res = await apiRequest<{ data?: unknown[] } | unknown[]>("/honors?limit=1");
        if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: unknown[] }).data)) {
          stats.totalHonors = (res as { data: unknown[]; meta?: { total?: number } }).meta?.total ?? null;
        }
      } catch { /* endpoint unavailable */ }
    },
    async () => {
      try {
        const res = await apiRequest<{ data?: unknown[] } | unknown[]>("/classes");
        if (Array.isArray(res)) {
          stats.totalClasses = res.length;
        } else if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: unknown[] }).data)) {
          stats.totalClasses = (res as { data: unknown[] }).data.length;
        }
      } catch { /* endpoint unavailable */ }
    },
  ];

  await Promise.allSettled(fetchers.map((fn) => fn()));
  return stats;
}

async function fetchRecentUsers(): Promise<RecentUser[]> {
  try {
    const res = await apiRequest<{ status?: string; data?: { data?: RecentUser[] } }>("/admin/users?limit=5&page=1");
    const list = res?.data?.data;
    if (Array.isArray(list)) return list;
    return [];
  } catch {
    return [];
  }
}

type RoleDistributionResult = {
  data: RoleDistributionEntry[];
  sampleSize: number;
};

async function fetchRoleDistribution(): Promise<RoleDistributionResult> {
  try {
    const res = await apiRequest<{ status?: string; data?: { data?: RecentUser[] } }>("/admin/users?limit=100&page=1");
    const list = res?.data?.data;
    if (!Array.isArray(list) || list.length === 0) return { data: [], sampleSize: 0 };

    const counts = new Map<string, number>();
    for (const user of list) {
      const roles: string[] = [];
      if (Array.isArray(user.roles)) roles.push(...user.roles);
      if (Array.isArray(user.users_roles)) {
        for (const ur of user.users_roles) {
          if (ur.roles?.role_name) roles.push(ur.roles.role_name);
        }
      }
      const unique = [...new Set(roles)];
      if (unique.length === 0) {
        counts.set("sin_rol", (counts.get("sin_rol") ?? 0) + 1);
      } else {
        for (const role of unique) {
          counts.set(role, (counts.get(role) ?? 0) + 1);
        }
      }
    }

    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    const data: RoleDistributionEntry[] = [...counts.entries()]
      .map(([role, count]) => ({ role, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);

    return { data, sampleSize: list.length };
  } catch {
    return { data: [], sampleSize: 0 };
  }
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number | null;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value !== null ? value.toLocaleString("es-MX") : "—"}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (email?.[0] ?? "?").toUpperCase();
}

function extractRoleNames(user: RecentUser): string[] {
  const roles: string[] = [];
  if (user.roles) roles.push(...user.roles);
  if (user.users_roles) {
    for (const ur of user.users_roles) {
      if (ur.roles?.role_name) roles.push(ur.roles.role_name);
    }
  }
  return [...new Set(roles)];
}

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Ayer";
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`;
    return date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

async function StatsSection() {
  const stats = await fetchStats();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Usuarios registrados"
        value={stats.totalUsers}
        subtitle={stats.pendingUsers !== null ? `${stats.pendingUsers} pendientes de aprobación` : "Total en el sistema"}
        icon={Users}
      />
      <StatCard
        title="Clubes activos"
        value={stats.activeClubs}
        subtitle={stats.totalClubs !== null ? `${stats.totalClubs} clubes en total` : "Clubes con estado activo"}
        icon={Building2}
      />
      <StatCard
        title="Camporees"
        value={stats.activeCamporees}
        subtitle="Eventos activos"
        icon={Tent}
      />
      <StatCard
        title="Especialidades"
        value={stats.totalHonors}
        subtitle={stats.totalClasses !== null ? `${stats.totalClasses} clases registradas` : "Total de especialidades"}
        icon={Award}
      />
    </div>
  );
}

async function RecentUsersSection() {
  const users = await fetchRecentUsers();

  if (users.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Usuarios recientes</CardTitle>
          <Link href="/dashboard/users" className="text-sm text-muted-foreground hover:underline">
            Ver todos
          </Link>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No se pudieron cargar los usuarios recientes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Usuarios recientes</CardTitle>
        <Link href="/dashboard/users" className="text-sm text-muted-foreground hover:underline">
          Ver todos
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => {
            const roleNames = extractRoleNames(user);
            const fullName = [user.name, user.paternal_last_name].filter(Boolean).join(" ") || user.email || "—";

            return (
              <div key={user.user_id} className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback className="text-xs">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  <Link
                    href={`/dashboard/users/${user.user_id}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {fullName}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{user.email ?? "—"}</p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  {roleNames.length > 0 ? (
                    roleNames.slice(0, 2).map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs">Sin rol</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block size-2 rounded-full ${user.active !== false ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <span className="hidden text-xs text-muted-foreground lg:inline">
                    {formatRelativeDate(user.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

const quickLinks = [
  { title: "Usuarios", description: "Gestionar", href: "/dashboard/users", icon: Users },
  { title: "Clubes", description: "Gestionar", href: "/dashboard/clubs", icon: Building2 },
  { title: "Clases", description: "Gestionar", href: "/dashboard/classes", icon: GraduationCap },
  { title: "Especialidades", description: "Gestionar", href: "/dashboard/honors", icon: Award },
];

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-1 h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function RoleDistributionSection() {
  const { data, sampleSize } = await fetchRoleDistribution();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribución de roles</CardTitle>
        <CardDescription>Roles con más usuarios asignados</CardDescription>
      </CardHeader>
      <CardContent>
        <RoleDistributionChart data={data} sampleSize={sampleSize} />
      </CardContent>
    </Card>
  );
}

function RoleDistributionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-36" />
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 flex-1 rounded" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentUsersSkeleton() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general del sistema SACDIA.</p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-3">
        <Suspense fallback={<RecentUsersSkeleton />}>
          <RecentUsersSection />
        </Suspense>

        <Suspense fallback={<RoleDistributionSkeleton />}>
          <RoleDistributionSection />
        </Suspense>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Accesos rápidos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <link.icon className="size-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{link.title}</p>
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
