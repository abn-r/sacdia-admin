import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { NotificationCategoriesTable } from "@/components/notifications/notification-categories-table";
import { requireAdminUser } from "@/lib/auth/session";
import { getNotificationCategorySettings } from "@/lib/api/notifications";
import { buildDefaultCategorySettings } from "@/lib/notifications/categories";
import { ApiError } from "@/lib/api/client";

export default async function ConfigurationNotificationsCategoriesPage() {
  await requireAdminUser();
  const t = await getTranslations("configuration.notifications");
  const tCat = await getTranslations("configuration.notifications.categories");

  let categories = buildDefaultCategorySettings();
  let loadError: string | null = null;

  try {
    categories = await getNotificationCategorySettings();
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : tCat("loadError");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("sections.categories.title")}
        description={t("sections.categories.description")}
        breadcrumbs={[
          { label: t("breadcrumbConfiguration"), href: "/dashboard/configuration" },
          { label: t("title"), href: "/dashboard/configuration/notifications" },
          { label: t("sections.categories.title") },
        ]}
      />

      <p className="text-sm text-muted-foreground">{tCat("intro")}</p>

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      <NotificationCategoriesTable categories={categories} />

      <p className="text-xs text-muted-foreground">{tCat("adminBypassNote")}</p>
      <p className="text-xs text-muted-foreground">{tCat("mobileToggleHelp")}</p>
    </div>
  );
}
