import { Suspense } from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  Tent,
  Award,
  GraduationCap,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RoleScopedStatsSection } from "@/components/dashboard/role-scoped-stats-section";
import { PendingMembershipQueue } from "@/components/membership/pending-membership-queue";
import { CoordinatorLfHome } from "@/components/dashboard/coordinator-lf-home";
import { RoleDistributionChart } from "@/components/dashboard/role-distribution-chart";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { V2MetricCard, V2MetricCards } from "@/components/v2/shared/v2-data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { shouldShowCoordinatorLfHome } from "@/lib/auth/panel-persona";
import { fetchCoordinatorLfHomeData } from "@/lib/dashboard/fetch-coordinator-lf-home-data";
import { requireAdminUser } from "@/lib/auth/session";
import {
  fetchRecentUsers,
  fetchRoleDistribution,
  fetchStats,
} from "@/lib/v2/loaders/dashboard-stats";
import { V2RecentUsersList } from "@/components/v2/dashboard/v2-recent-users-list";
import { cn } from "@/lib/utils";
import { toV2Path } from "@/lib/v2/route-map";

const statCardConfig = [
  { iconBg: "bg-primary/10", iconColor: "text-primary" },
  { iconBg: "bg-success/10", iconColor: "text-success" },
  { iconBg: "bg-warning/15", iconColor: "text-warning-foreground dark:text-warning" },
  { iconBg: "bg-info/10", iconColor: "text-info" },
];

function StatsSkeleton() {
  return (
    <V2MetricCards>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </V2MetricCards>
  );
}

async function StatsSection() {
  const t = await getTranslations("dashboardHub");
  const stats = await fetchStats();
  const cards = [
    { title: t("stats.registeredUsers"), value: stats.totalUsers, subtitle: t("stats.totalInSystem"), icon: Users },
    { title: t("stats.activeClubs"), value: stats.activeClubs, subtitle: t("stats.activeClubsStatus"), icon: Building2 },
    { title: t("stats.camporees"), value: stats.activeCamporees, subtitle: t("stats.activeEvents"), icon: Tent },
    { title: t("stats.honors"), value: stats.totalHonors, subtitle: t("stats.totalHonors"), icon: Award },
  ];

  return (
    <V2MetricCards>
      {cards.map((card, index) => {
        const config = statCardConfig[index % statCardConfig.length];
        const Icon = card.icon;
        return (
          <V2MetricCard
            key={card.title}
            title={card.title}
            value={
              card.value !== null ? (
                card.value.toLocaleString("es-MX")
              ) : (
                <span className="text-muted-foreground/40">—</span>
              )
            }
            description={card.subtitle}
            icon={
              <div className={cn("flex size-9 items-center justify-center rounded-lg", config.iconBg)}>
                <Icon className={cn("size-[18px]", config.iconColor)} />
              </div>
            }
          />
        );
      })}
    </V2MetricCards>
  );
}

async function RecentUsersSection() {
  const t = await getTranslations("dashboardHub");
  const users = await fetchRecentUsers();

  return (
    <Card className="col-span-2 border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base">{t("recentUsers.title")}</CardTitle>
          <CardDescription>{t("recentUsers.description")}</CardDescription>
        </div>
        <Link
          href={toV2Path("/dashboard/users")}
          prefetch={false}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("recentUsers.viewAll")}
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <V2RecentUsersList users={users} />
      </CardContent>
    </Card>
  );
}

async function RoleDistributionSection() {
  const t = await getTranslations("dashboardHub");
  const { data, sampleSize } = await fetchRoleDistribution();

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{t("roleChart.title")}</CardTitle>
            <CardDescription>{t("roleChart.description")}</CardDescription>
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

async function QuickLinks() {
  const t = await getTranslations("dashboardHub");
  const links = [
    { title: t("quickLinks.users"), description: t("quickLinks.usersDesc"), href: toV2Path("/dashboard/users"), icon: Users },
    { title: t("quickLinks.clubs"), description: t("quickLinks.clubsDesc"), href: toV2Path("/dashboard/clubs"), icon: Building2 },
    { title: t("quickLinks.classes"), description: t("quickLinks.classesDesc"), href: toV2Path("/dashboard/classes"), icon: GraduationCap },
    { title: t("quickLinks.honors"), description: t("quickLinks.honorsDesc"), href: toV2Path("/dashboard/honors"), icon: Award },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {links.map((link) => (
        <Link key={link.href} href={link.href} prefetch={false}>
          <Card className="h-full border-border/60 shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
            <CardContent className="flex items-center gap-3.5 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <link.icon className="size-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-none">{link.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{link.description}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/40" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function V2DashboardHomePage() {
  const user = await requireAdminUser();

  if (shouldShowCoordinatorLfHome(user)) {
    const coordinatorData = await fetchCoordinatorLfHomeData(user);
    return <CoordinatorLfHome data={coordinatorData} />;
  }

  const t = await getTranslations("dashboardHub");

  return (
    <div className="space-y-6">
      <V2PageShell title={t("title")} description={t("description")} bleed />

      <Suspense fallback={<StatsSkeleton />}>
        <RoleScopedStatsSection />
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      <Suspense fallback={null}>
        <PendingMembershipQueue />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-3">
        <Suspense fallback={<Skeleton className="col-span-2 h-72 rounded-xl" />}>
          <RecentUsersSection />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>
          <RoleDistributionSection />
        </Suspense>
      </div>

      <div>
        <h2 className="mb-4 text-base font-semibold">{t("quickLinks.title")}</h2>
        <QuickLinks />
      </div>
    </div>
  );
}
