import { Building2, Tent, UserPlus, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { requireAdminUser } from "@/lib/auth/session";
import { fetchScopedDashboardStats } from "@/lib/dashboard/fetch-scoped-dashboard";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";

const statCardConfig = [
  { iconBg: "bg-primary/10", iconColor: "text-primary" },
  { iconBg: "bg-success/10", iconColor: "text-success" },
  { iconBg: "bg-warning/15", iconColor: "text-warning-foreground dark:text-warning" },
  { iconBg: "bg-info/10", iconColor: "text-info" },
];

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorIndex = 0,
  badge,
}: {
  title: string;
  value: number | null;
  subtitle: string;
  icon: React.ElementType;
  colorIndex?: number;
  badge?: string | null;
}) {
  const config = statCardConfig[colorIndex % statCardConfig.length];

  return (
    <Card className="group relative overflow-hidden transition-all hover:border-primary/20 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            config.iconBg,
          )}
        >
          <Icon className={cn("size-[18px]", config.iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className="text-3xl font-bold tracking-tight tabular-nums">
            {value !== null ? (
              value.toLocaleString("es-MX")
            ) : (
              <span className="text-muted-foreground/40">—</span>
            )}
          </div>
          {badge ? (
            <Badge variant="soft-warning" className="text-[10px]">
              {badge}
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export async function RoleScopedStatsSection() {
  const user = await requireAdminUser();
  const t = await getTranslations("dashboardHub");
  const stats = await fetchScopedDashboardStats(user);

  const scopeLabel = stats.scopeName
    ? t(`scope.${stats.scopeLabelKey}`, { name: stats.scopeName })
    : t(`scope.${stats.scopeLabelKey}`);

  const statCards = [
    {
      title: t("stats.registeredUsers"),
      value: stats.totalUsers,
      subtitle: t("stats.totalInSystem"),
      icon: Users,
    },
    {
      title: t("stats.activeClubs"),
      value: stats.activeClubs,
      subtitle:
        stats.totalClubs !== null
          ? t("stats.totalClubs", { count: stats.totalClubs })
          : t("stats.activeClubsStatus"),
      icon: Building2,
    },
    {
      title: t("stats.pendingMembership"),
      value: stats.canReviewMembership ? stats.pendingMembershipCount : null,
      subtitle: stats.canReviewMembership
        ? t("stats.pendingMembershipHint")
        : t("stats.pendingMembershipUnavailable"),
      icon: UserPlus,
      badge:
        stats.pendingMembershipCount && stats.pendingMembershipCount > 0
          ? t("stats.pendingBadge", { count: stats.pendingMembershipCount })
          : null,
    },
    {
      title: t("stats.camporees"),
      value: null,
      subtitle: t("stats.activeEvents"),
      icon: Tent,
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{scopeLabel}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <div
            key={card.title}
            className={STAGGER_CLASSES}
            style={getStaggerStyle(index, 50)}
          >
            <StatCard {...card} colorIndex={index} />
          </div>
        ))}
      </div>
    </div>
  );
}
