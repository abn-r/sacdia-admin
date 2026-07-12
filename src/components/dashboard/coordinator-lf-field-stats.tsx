import type { ReactNode } from "react";
import {
  Activity,
  Award,
  BarChart3,
  Building2,
  ClipboardList,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LocalFieldDashboard } from "@/lib/api/local-field-dashboard";

const CLUB_TYPE_I18N_KEYS: Record<number, string> = {
  1: "adventurers",
  2: "conquistadores",
  3: "masterGuides",
};

interface CoordinatorLfFieldStatsProps {
  stats: LocalFieldDashboard;
}

function StatCard({
  icon,
  label,
  value,
  hint,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border bg-card p-5 shadow-sm", className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function WindowPills({
  windows,
  t,
}: {
  windows: { last_7_days: number; last_30_days: number; last_90_days: number };
  t: Awaited<ReturnType<typeof getTranslations<"coordinatorLfHome">>>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="soft-info">
        {t("fieldStats.windows.week", { count: windows.last_7_days })}
      </Badge>
      <Badge variant="soft-success">
        {t("fieldStats.windows.month", { count: windows.last_30_days })}
      </Badge>
      <Badge variant="soft">
        {t("fieldStats.windows.quarter", { count: windows.last_90_days })}
      </Badge>
    </div>
  );
}

export async function CoordinatorLfFieldStats({
  stats,
}: CoordinatorLfFieldStatsProps) {
  const t = await getTranslations("coordinatorLfHome");

  const monthLabel = t(`fieldStats.months.${stats.report_month}` as "fieldStats.months.1");
  const yearLabel =
    stats.ecclesiastical_year_label ??
    String(stats.ecclesiastical_year_id || "—");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{t("fieldStats.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("fieldStats.subtitle", {
                year: yearLabel,
                month: monthLabel,
                yearNumber: stats.report_year,
              })}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Users className="size-4" />}
            label={t("fieldStats.overview.activeMembers")}
            value={stats.active_members}
            hint={t("fieldStats.overview.activeMembersHint")}
          />
          <StatCard
            icon={<Building2 className="size-4" />}
            label={t("fieldStats.overview.enrolledClubs")}
            value={stats.enrolled_clubs_this_year}
            hint={t("fieldStats.overview.enrolledClubsHint", {
              sections: stats.enrolled_sections_this_year,
            })}
          />
          <StatCard
            icon={<ClipboardList className="size-4" />}
            label={t("fieldStats.overview.withReport")}
            value={stats.clubs_with_monthly_report}
            hint={t("fieldStats.overview.withReportHint", {
              month: monthLabel,
            })}
          />
          <StatCard
            icon={<BarChart3 className="size-4" />}
            label={t("fieldStats.overview.withoutReport")}
            value={stats.clubs_without_monthly_report}
            hint={t("fieldStats.overview.withoutReportHint", {
              month: monthLabel,
            })}
            className="border-warning/30 bg-warning/5"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">{t("fieldStats.membersByClass.title")}</h3>
        <div className="grid gap-4 lg:grid-cols-3">
          {stats.members_by_club_type.map((clubType) => {
            const typeKey = CLUB_TYPE_I18N_KEYS[clubType.club_type_id];
            const title = typeKey
              ? t(`fieldStats.clubTypes.${typeKey}` as "fieldStats.clubTypes.adventurers")
              : clubType.club_type_name;
            const totalMembers = clubType.classes.reduce(
              (sum, row) => sum + row.member_count,
              0,
            );

            return (
              <div
                key={clubType.club_type_id}
                className="rounded-3xl border bg-card p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="font-semibold">{title}</h4>
                  <Badge variant="outline">{totalMembers}</Badge>
                </div>
                {clubType.classes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("fieldStats.membersByClass.empty")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {clubType.classes.map((row) => (
                      <div
                        key={row.class_id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-3 py-2 text-sm"
                      >
                        <span className="truncate">{row.class_name}</span>
                        <span className="font-semibold tabular-nums">
                          {row.member_count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">
              {t("fieldStats.honors.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("fieldStats.honors.subtitle")}
            </p>
          </div>
          <WindowPills windows={stats.honors_completed_total} t={t} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {stats.honors_completed_by_club_type.map((clubType) => {
            const typeKey = CLUB_TYPE_I18N_KEYS[clubType.club_type_id];
            const title = typeKey
              ? t(`fieldStats.clubTypes.${typeKey}` as "fieldStats.clubTypes.adventurers")
              : clubType.club_type_name;

            return (
              <div
                key={clubType.club_type_id}
                className="rounded-3xl border bg-card p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Award className="size-4 text-primary" />
                  <h4 className="font-semibold">{title}</h4>
                </div>
                <WindowPills windows={clubType.completed} t={t} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <h3 className="text-lg font-semibold">{t("fieldStats.activities.title")}</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              {t("fieldStats.activities.week")}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {stats.activities.last_7_days}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              {t("fieldStats.activities.month")}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {stats.activities.last_30_days}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              {t("fieldStats.activities.year")}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {stats.activities.last_365_days}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
