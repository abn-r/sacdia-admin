"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
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
  const { investiture, timing, approval_rate } = data;

  const avgDays = timing.avg_days_total;
  const avgDaysLabel = avgDays !== null ? `${avgDays} días promedio` : "Sin datos";

  const overdueVariant: StatCardProps["badgeVariant"] =
    investiture.overdue === 0 ? "success" : investiture.overdue < 5 ? "warning" : "destructive";

  const approvalVariant: StatCardProps["badgeVariant"] =
    approval_rate.rate >= 80 ? "success" : approval_rate.rate >= 60 ? "warning" : "destructive";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total pendientes"
        value={investiture.total_pending}
        subtitle={`${investiture.in_review} en revisión activa`}
        icon={Clock}
      />
      <StatCard
        title="Vencidos"
        value={investiture.overdue}
        subtitle="Enviados hace más de 30 días"
        icon={AlertTriangle}
        badgeLabel={investiture.overdue === 0 ? "Al día" : "Requieren atención"}
        badgeVariant={overdueVariant}
      />
      <StatCard
        title="Promedio de aprobación"
        value={avgDaysLabel}
        subtitle="De inscripción a investido"
        icon={TrendingUp}
      />
      <StatCard
        title="Tasa de aprobación"
        value={`${approval_rate.rate}%`}
        subtitle={`${approval_rate.resolved} resueltos (90 días)`}
        icon={CheckCircle2}
        badgeLabel={`${approval_rate.approved} aprobados`}
        badgeVariant={approvalVariant}
      />
    </div>
  );
}
