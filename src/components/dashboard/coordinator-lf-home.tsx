import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MapPin,
  Tent,
  UserPlus,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CoordinatorLfHomeData } from "@/lib/dashboard/fetch-coordinator-lf-home-data";
import { CoordinatorLfFieldStats } from "@/components/dashboard/coordinator-lf-field-stats";

interface CoordinatorLfHomeProps {
  data: CoordinatorLfHomeData;
}

function formatGreeting(
  hour: number,
  t: Awaited<ReturnType<typeof getTranslations<"coordinatorLfHome">>>,
) {
  if (hour < 12) return t("greetingMorning");
  if (hour < 19) return t("greetingAfternoon");
  return t("greetingEvening");
}

export async function CoordinatorLfHome({ data }: CoordinatorLfHomeProps) {
  const t = await getTranslations("coordinatorLfHome");
  const hour = new Date().getHours();
  const greeting = formatGreeting(hour, t);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-info/10 via-card to-primary/10 p-6 shadow-sm sm:p-8">
        <div className="relative space-y-4">
          <Badge variant="soft-info" className="rounded-full px-3 py-1">
            <MapPin className="size-3.5" />
            {data.scopeLabel}
          </Badge>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {data.userName}
            </h1>
            <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5">
              <Building2 className="size-4 text-primary" />
              {t("stats.clubs", { count: data.activeClubs })}
            </span>
            {data.totalPending > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1.5 text-warning-foreground dark:text-warning">
                <UserPlus className="size-4" />
                {t("stats.pending", { count: data.totalPending })}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {data.canApproveMembers && data.totalPending > 0 ? (
        <section className="rounded-3xl border border-warning/30 bg-warning/8 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-lg font-semibold">
                {t("pendingAlert.title", { count: data.totalPending })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("pendingAlert.description")}
              </p>
            </div>
            <Button size="lg" className="rounded-2xl" asChild>
              <Link href="/dashboard/requests/membership" prefetch={false}>
                <CheckCircle2 className="size-4" />
                {t("pendingAlert.action")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      {data.fieldStats ? (
        <CoordinatorLfFieldStats stats={data.fieldStats} />
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{t("clubs.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("clubs.description")}</p>
          </div>
          <Button variant="outline" className="rounded-2xl" asChild>
            <Link href="/dashboard/clubs" prefetch={false}>
              {t("clubs.viewAll")}
            </Link>
          </Button>
        </div>

        {data.clubs.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("clubs.empty")}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.clubs.map((club) => (
              <Link
                key={club.clubId}
                href={`/dashboard/clubs/${club.clubId}`}
                prefetch={false}
                className={cn(
                  "group rounded-3xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
                  !club.active && "opacity-70",
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-lg font-semibold">{club.name}</p>
                    {club.pendingCount > 0 ? (
                      <Badge variant="soft-warning">
                        {t("clubs.pendingBadge", { count: club.pendingCount })}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[club.districtName, club.localFieldName]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  <p className="text-sm">
                    {t("clubs.sections", {
                      active: club.activeSections,
                      total: club.totalSections,
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border bg-card p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">{t("quickActions.title")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto justify-start rounded-2xl px-4 py-4" asChild>
            <Link href="/dashboard/clubs" prefetch={false}>
              <Building2 className="size-4" />
              <span className="text-left">
                <span className="block font-medium">{t("quickActions.clubs")}</span>
              </span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start rounded-2xl px-4 py-4" asChild>
            <Link href="/dashboard/users" prefetch={false}>
              <Users className="size-4" />
              <span className="text-left">
                <span className="block font-medium">{t("quickActions.users")}</span>
              </span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start rounded-2xl px-4 py-4" asChild>
            <Link href="/dashboard/requests/membership" prefetch={false}>
              <UserPlus className="size-4" />
              <span className="text-left">
                <span className="block font-medium">{t("quickActions.membership")}</span>
              </span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start rounded-2xl px-4 py-4" asChild>
            <Link href="/dashboard/camporees" prefetch={false}>
              <Tent className="size-4" />
              <span className="text-left">
                <span className="block font-medium">{t("quickActions.camporees")}</span>
              </span>
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
