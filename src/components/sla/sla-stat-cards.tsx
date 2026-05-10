"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SlaDashboard } from "@/lib/api/analytics";

interface SlaStatCardsProps {
  data: SlaDashboard;
}

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  badgeLabel?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
};

function StatCard({ title, value, subtitle, icon: Icon, badgeLabel, badgeVariant = "secondary" }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString("es-MX") : value}</div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {badgeLabel && (
            <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0">
              {badgeLabel}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SlaStatCards({ data }: SlaStatCardsProps) {
  const t = useTranslations("sla.stats");
  const { investiture, timing, approval_rate } = data;

  const avgDays = timing.avg_days_total;
  const avgDaysLabel = avgDays !== null ? t("avg_approval_days", { days: avgDays }) : t("avg_approval_no_data");

  const overdueVariant: StatCardProps["badgeVariant"] =
    investiture.overdue === 0 ? "success" : investiture.overdue < 5 ? "warning" : "destructive";

  const approvalVariant: StatCardProps["badgeVariant"] =
    approval_rate.rate >= 80 ? "success" : approval_rate.rate >= 60 ? "warning" : "destructive";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={t("total_pending")}
        value={investiture.total_pending}
        subtitle={t("total_pending_subtitle", { count: investiture.in_review })}
        icon={Clock}
      />
      <StatCard
        title={t("overdue")}
        value={investiture.overdue}
        subtitle={t("overdue_subtitle")}
        icon={AlertTriangle}
        badgeLabel={investiture.overdue === 0 ? t("overdue_badge_ok") : t("overdue_badge_attention")}
        badgeVariant={overdueVariant}
      />
      <StatCard
        title={t("avg_approval")}
        value={avgDaysLabel}
        subtitle={t("avg_approval_subtitle")}
        icon={TrendingUp}
      />
      <StatCard
        title={t("approval_rate")}
        value={`${approval_rate.rate}%`}
        subtitle={t("approval_rate_subtitle", { count: approval_rate.resolved })}
        icon={CheckCircle2}
        badgeLabel={t("approval_rate_badge", { count: approval_rate.approved })}
        badgeVariant={approvalVariant}
      />
    </div>
  );
}
