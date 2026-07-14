import Link from "next/link";
import { Bell, History, Tags } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { NotificationStatsCards } from "@/components/notifications/notification-stats-cards";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";
import {
  NOTIFICATIONS_BROADCAST,
  NOTIFICATIONS_CLUB,
  NOTIFICATIONS_SEND,
} from "@/lib/auth/permissions";
import { getNotificationStats } from "@/lib/api/notifications";
import { ApiError } from "@/lib/api/client";

export default async function ConfigurationNotificationsPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("configuration.notifications");

  const canSend =
    hasPermission(user, NOTIFICATIONS_SEND) ||
    hasPermission(user, NOTIFICATIONS_BROADCAST) ||
    hasPermission(user, NOTIFICATIONS_CLUB);

  let stats = null;
  let statsError: string | null = null;

  try {
    stats = await getNotificationStats(30);
  } catch (error) {
    statsError =
      error instanceof ApiError ? error.message : t("statsLoadError");
  }

  const sections = [
    {
      title: t("sections.management.title"),
      description: t("sections.management.description"),
      href: "/dashboard/configuration/notifications/history",
      icon: History,
      visible: true,
    },
    {
      title: t("sections.categories.title"),
      description: t("sections.categories.description"),
      href: "/dashboard/configuration/notifications/categories",
      icon: Tags,
      visible: true,
    },
  ].filter((section) => section.visible);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("breadcrumbConfiguration"), href: "/dashboard/configuration" },
          { label: t("title") },
        ]}
      />

      {statsError && (
        <EndpointErrorBanner state="missing" detail={statsError} />
      )}

      {stats && <NotificationStatsCards stats={stats} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <section.icon className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">{section.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {section.description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {!canSend && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Bell className="mr-2 inline size-4" />
          {t("sendPermissionHint")}
        </div>
      )}
    </div>
  );
}
