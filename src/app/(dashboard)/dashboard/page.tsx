import { Suspense } from "react";
import {
  Users,
  Building2,
  Tent,
  Award,
  GraduationCap,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import {
  RoleDistributionChart,
  type RoleDistributionEntry,
} from "@/components/dashboard/role-distribution-chart";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";

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
        const res = await apiRequest<{
          data?: { meta?: { total?: number } };
          meta?: { total?: number };
        }>("/admin/users?limit=1&page=1");
        stats.totalUsers =
          res?.data?.meta?.total ?? res?.meta?.total ?? null;
      } catch {
        /* endpoint unavailable */
      }
    },
    async () => {
      try {
        const res = await apiRequest<{ data?: unknown[] } | unknown[]>(
          "/clubs?status=active&limit=1"
        );
        if (Array.isArray(res)) {
          stats.activeClubs = res.length;
        } else if (res?.data && Array.isArray(res.data)) {
          stats.activeClubs = res.data.length;
        }
      } catch {
        /* endpoint unavailable */
      }
    },
    async () => {
      try {
        const res = await apiRequest<{ data?: unknown[] } | unknown[]>(
          "/honors?limit=1"
        );
        if (
          res &&
          typeof res === "object" &&
          "data" in res &&
          Array.isArray((res as { data: unknown[] }).data)
        ) {
          stats.totalHonors =
            (res as { data: unknown[]; meta?: { total?: number } }).meta
              ?.total ?? null;
        }
      } catch {
        /* endpoint unavailable */
      }
    },
    async () => {
      try {
        const res = await apiRequest<{ data?: unknown[] } | unknown[]>(
          "/classes"
        );
        if (Array.isArray(res)) {
          stats.totalClasses = res.length;
        } else if (
          res &&
          typeof res === "object" &&
          "data" in res &&
          Array.isArray((res as { data: unknown[] }).data)
        ) {
          stats.totalClasses = (res as { data: unknown[] }).data.length;
        }
      } catch {
        /* endpoint unavailable */
      }
    },
  ];

  await Promise.allSettled(fetchers.map((fn) => fn()));
  return stats;
}

async function fetchRecentUsers(): Promise<RecentUser[]> {
  try {
    const res = await apiRequest<{
      status?: string;
      data?: { data?: RecentUser[] };
    }>("/admin/users?limit=5&page=1");
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
    const res = await apiRequest<{
      status?: string;
      data?: { data?: RecentUser[] };
    }>("/admin/users?limit=100&page=1");
    const list = res?.data?.data;
    if (!Array.isArray(list) || list.length === 0)
      return { data: [], sampleSize: 0 };

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
      .map(([role, count]) => ({
        role,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return { data, sampleSize: list.length };
  } catch {
    return { data: [], sampleSize: 0 };
  }
}

// Stat card config: semantic tokens (Ember palette)
// 0: primary | 1: success | 2: warning | 3: info
const statCardConfig = [
  {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  {
    iconBg: "bg-warning/15",
    iconColor: "text-warning-foreground dark:text-warning",
  },
  {
    iconBg: "bg-info/10",
    iconColor: "text-info",
  },
];

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorIndex = 0,
}: {
  title: string;
  value: number | null;
  subtitle: string;
  icon: React.ElementType;
  colorIndex?: number;
}) {
  const config = statCardConfig[colorIndex % statCardConfig.length];

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            config.iconBg
          )}
        >
          <Icon className={cn("size-4", config.iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight tabular-nums">
          {value !== null ? value.toLocaleString("es-MX") : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name)
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

async function StatsSection() {
  const stats = await fetchStats();

  const statCards = [
    {
      title: "Usuarios registrados",
      value: stats.totalUsers,
      subtitle:
        stats.pendingUsers !== null
          ? `${stats.pendingUsers} pendientes de aprobación`
          : "Total en el sistema",
      icon: Users,
    },
    {
      title: "Clubes activos",
      value: stats.activeClubs,
      subtitle:
        stats.totalClubs !== null
          ? `${stats.totalClubs} clubes en total`
          : "Clubes con estado activo",
      icon: Building2,
    },
    {
      title: "Camporees",
      value: stats.activeCamporees,
      subtitle: "Eventos activos",
      icon: Tent,
    },
    {
      title: "Especialidades",
      value: stats.totalHonors,
      subtitle:
        stats.totalClasses !== null
          ? `${stats.totalClasses} clases registradas`
          : "Total de especialidades",
      icon: Award,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card, index) => (
        <StatCard key={card.title} {...card} colorIndex={index} />
      ))}
    </div>
  );
}

async function RecentUsersSection() {
  const users = await fetchRecentUsers();

  if (users.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Usuarios recientes</CardTitle>
            <CardDescription>Últimos registros en el sistema</CardDescription>
          </div>
          <Link
            href="/dashboard/users"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver todos
            <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No se pudieron cargar los usuarios recientes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base">Usuarios recientes</CardTitle>
          <CardDescription>Últimos registros en el sistema</CardDescription>
        </div>
        <Link
          href="/dashboard/users"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver todos
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border/60">
          {users.map((user) => {
            const roleNames = extractRoleNames(user);
            const fullName =
              [user.name, user.paternal_last_name].filter(Boolean).join(" ") ||
              user.email ||
              "—";

            return (
              <div
                key={user.user_id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="text-xs font-medium">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  <Link
                    href={`/dashboard/users/${user.user_id}`}
                    className="block truncate text-sm font-medium leading-none hover:underline"
                  >
                    {fullName}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email ?? "—"}
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                  {roleNames.length > 0 ? (
                    roleNames.slice(0, 1).map((role) => (
                      <Badge
                        key={role}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs font-normal">
                      Sin rol
                    </Badge>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "inline-block size-1.5 rounded-full",
                      user.active !== false
                        ? "bg-success"
                        : "bg-muted-foreground/30"
                    )}
                  />
                  <span className="hidden text-xs tabular-nums text-muted-foreground lg:inline">
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
  {
    title: "Usuarios",
    description: "Gestionar cuentas",
    href: "/dashboard/users",
    icon: Users,
    colorIndex: 0, // primary
  },
  {
    title: "Clubes",
    description: "Administrar clubes",
    href: "/dashboard/clubs",
    icon: Building2,
    colorIndex: 3, // info
  },
  {
    title: "Clases",
    description: "Ver y editar clases",
    href: "/dashboard/classes",
    icon: GraduationCap,
    colorIndex: 1, // success
  },
  {
    title: "Especialidades",
    description: "Gestionar honores",
    href: "/dashboard/honors",
    icon: Award,
    colorIndex: 2, // warning
  },
];

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-9 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-7 w-16" />
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
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Distribución de roles</CardTitle>
            <CardDescription>Asignaciones en los últimos 100 usuarios</CardDescription>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="size-4 text-primary" />
          </div>
        </div>
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
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="size-9 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-20 shrink-0" />
            <Skeleton className="h-3 flex-1 rounded-full" />
            <Skeleton className="h-3 w-8 shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentUsersSkeleton() {
  return (
    <Card className="col-span-2">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  await requireAdminUser();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Resumen general del sistema SACDIA."
      />

      {/* Stats grid */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      {/* Main grid: recent users + role chart */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Suspense fallback={<RecentUsersSkeleton />}>
          <RecentUsersSection />
        </Suspense>

        <Suspense fallback={<RoleDistributionSkeleton />}>
          <RoleDistributionSection />
        </Suspense>
      </div>

      {/* Quick links */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Accesos rápidos</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => {
            const config =
              statCardConfig[link.colorIndex % statCardConfig.length];
            return (
              <Link key={link.href} href={link.href}>
                <Card className="group h-full transition-all hover:shadow-md hover:-translate-y-0.5">
                  <CardContent className="flex items-center gap-3.5 p-4">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                        config.iconBg
                      )}
                    >
                      <link.icon className={cn("size-5", config.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none">
                        {link.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
