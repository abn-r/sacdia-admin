import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { UrlTabs } from "@/components/shared/url-tabs";
import { NotificationCategoriesTable } from "@/components/notifications/notification-categories-table";
import { NotificationHistoryFilters } from "@/components/notifications/notification-history-filters";
import { NotificationHistoryTable } from "@/components/notifications/notification-history-table";
import { NotificationStatsCards } from "@/components/notifications/notification-stats-cards";
import { getNotificationCategorySettings } from "@/lib/api/notifications";
import { errorStateFromError } from "@/lib/api/error-state";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { canComposeAny, resolveComposePermissions } from "@/lib/notifications/compose-data";
import {
  parseHistoryFilters,
  parseNotificationTab,
  type NotificationTab,
} from "@/lib/notifications/history-view";
import type { NotificationCategorySetting } from "@/lib/notifications/categories";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readPositiveInt(value: string | string[] | undefined, fallback: number): number {
  const raw = typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications.page");
  return { title: t("title") };
}

export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAdminUser();
  const t = await getTranslations("notifications.page");
  const tc = await getTranslations("people.community.notifications");

  const canSent = canViewScreen(user, "notifications-history");
  const canCategories = canViewScreen(user, "notifications-categories");

  if (!canSent && !canCategories) {
    return <PageAccessForbidden title={t("title")} />;
  }

  const raw = await searchParams;
  const requested = parseNotificationTab(typeof raw.tab === "string" ? raw.tab : undefined);
  const tab: NotificationTab =
    requested === "categories" && canCategories ? "categories" : canSent ? "sent" : "categories";
  const defaultTab: NotificationTab = canSent ? "sent" : "categories";

  const tabs = [
    ...(canSent ? [{ value: "sent", label: tc("tabs.sent") }] : []),
    ...(canCategories ? [{ value: "categories", label: tc("tabs.categories") }] : []),
  ];

  const canCompose = canComposeAny(resolveComposePermissions(user));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={tc("page.description")}
        actions={
          tab === "sent" && canCompose ? (
            <Button asChild>
              <Link href="/dashboard/notifications/new">
                <Plus className="size-4" />
                {tc("actions.new")}
              </Link>
            </Button>
          ) : undefined
        }
      />

      {tabs.length > 1 ? (
        <Suspense fallback={<Skeleton className="h-9 w-64" />}>
          <UrlTabs tabs={tabs} defaultValue={defaultTab} ariaLabel={tc("tabs.label")} />
        </Suspense>
      ) : null}

      {tab === "sent" ? (
        <SentTab raw={raw} />
      ) : (
        <CategoriesTab canEdit={canCapability(user, "notifications-categories", "update")} />
      )}
    </div>
  );
}

function SentTab({ raw }: { raw: Record<string, string | string[] | undefined> }) {
  const page = readPositiveInt(raw.page, 1);
  const limit = Math.min(readPositiveInt(raw.limit, 20), 100);
  const filters = parseHistoryFilters(raw);

  return (
    <div className="space-y-4">
      <Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
        <NotificationStatsCards />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-9" />}>
        <NotificationHistoryFilters />
      </Suspense>
      <Suspense
        key={`${page}-${limit}-${filters.q}-${filters.audience}-${filters.range}`}
        fallback={<Skeleton className="h-64 rounded-xl" />}
      >
        <NotificationHistoryTable page={page} limit={limit} filters={filters} />
      </Suspense>
    </div>
  );
}

async function CategoriesTab({ canEdit }: { canEdit: boolean }) {
  const t = await getTranslations("people.community.notifications.categories");

  let categories: NotificationCategorySetting[] | null = null;
  let failure: ReturnType<typeof errorStateFromError> | null = null;
  try {
    const result = await getNotificationCategorySettings();
    if (Array.isArray(result)) categories = result;
    else failure = { kind: "error", detail: { at: new Date() } };
  } catch (error) {
    failure = errorStateFromError(error);
  }

  return (
    <div className="space-y-3">
      <NotificationCategoriesTable categories={categories} failure={failure} canEdit={canEdit} />
      {categories !== null ? (
        <>
          {canEdit ? null : <p className="text-muted-foreground text-sm">{t("readOnly")}</p>}
          <p className="text-muted-foreground text-xs">{t("hint")}</p>
        </>
      ) : null}
    </div>
  );
}
