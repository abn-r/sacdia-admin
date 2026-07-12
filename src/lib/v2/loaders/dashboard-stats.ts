import { apiRequest } from "@/lib/api/client";
import { listAdminUsers, type AdminUser } from "@/lib/api/admin-users";
import { extractAdminUserRoleNames } from "@/lib/admin-users/role-names";
import type { RoleDistributionEntry } from "@/components/dashboard/role-distribution-chart";

export type StatsData = {
  totalUsers: number | null;
  pendingUsers: number | null;
  activeClubs: number | null;
  totalClubs: number | null;
  activeCamporees: number | null;
  totalHonors: number | null;
  totalClasses: number | null;
};

export type RecentUser = AdminUser;

export async function fetchRecentUsers(): Promise<RecentUser[]> {
  try {
    const result = await listAdminUsers({ limit: 5, page: 1 });
    const items = result?.items;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export async function fetchStats(): Promise<StatsData> {
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
        stats.totalUsers = res?.data?.meta?.total ?? res?.meta?.total ?? null;
      } catch {
        /* unavailable */
      }
    },
    async () => {
      try {
        const res = await apiRequest<{ data?: unknown[] } | unknown[]>(
          "/clubs?status=active&limit=1",
        );
        if (Array.isArray(res)) {
          stats.activeClubs = res.length;
        } else if (res?.data && Array.isArray(res.data)) {
          stats.activeClubs = res.data.length;
        }
      } catch {
        /* unavailable */
      }
    },
    async () => {
      try {
        const res = await apiRequest<{ data?: unknown[] } | unknown[]>(
          "/honors?limit=1",
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
        /* unavailable */
      }
    },
    async () => {
      try {
        const res = await apiRequest<{ data?: unknown[] } | unknown[]>(
          "/classes",
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
        /* unavailable */
      }
    },
  ];

  await Promise.allSettled(fetchers.map((fn) => fn()));
  return stats;
}

export async function fetchRoleDistribution(): Promise<{
  data: RoleDistributionEntry[];
  sampleSize: number;
}> {
  try {
    const result = await listAdminUsers({ limit: 100, page: 1 });
    const list = Array.isArray(result?.items) ? result.items : [];
    if (list.length === 0) {
      return { data: [], sampleSize: 0 };
    }

    const counts = new Map<string, number>();
    for (const user of list) {
      const unique = extractAdminUserRoleNames(user);
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
