import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability } from "@/lib/auth/screen-catalog";
import { listAuthorizedNotificationClubTargets } from "@/lib/notifications/club-targets";
import { NotificationHistoryTable } from "@/components/notifications/notification-history-table";
import { NotificationComposeSheet } from "@/components/notifications/notification-compose-sheet";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    compose?: string;
    type?: string;
  }>;
}

function parseComposeType(
  value: string | undefined,
): "direct" | "broadcast" | "club" | undefined {
  if (value === "direct" || value === "broadcast" || value === "club") {
    return value;
  }
  return undefined;
}

export default async function ConfigurationNotificationsHistoryPage({
  searchParams,
}: PageProps) {
  const user = await requireAdminUser();
  const t = await getTranslations("notifications");
  const tHub = await getTranslations("configuration.notifications");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.max(1, Number(params.limit ?? 20));
  const composeOpen = params.compose === "1";
  const composeType = parseComposeType(params.type);

  const canSendDirect = canCapability(user, "notifications-hub", "send_direct");
  const canBroadcast = canCapability(user, "notifications-hub", "broadcast");
  const canSendClub = canCapability(user, "notifications-hub", "send_club");
  const canCompose = canSendDirect || canBroadcast || canSendClub;

  let clubTargets: Awaited<
    ReturnType<typeof listAuthorizedNotificationClubTargets>
  > = [];
  let clubTargetsLoadError = false;

  if (canSendClub) {
    try {
      clubTargets = await listAuthorizedNotificationClubTargets();
    } catch {
      clubTargetsLoadError = true;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tHub("unified.title")}
        description={tHub("unified.description")}
        breadcrumbs={[
          { label: tHub("breadcrumbConfiguration"), href: "/dashboard/configuration" },
          { label: tHub("title"), href: "/dashboard/configuration/notifications" },
          { label: tHub("sections.management.title") },
        ]}
        actions={
          canCompose ? (
            <NotificationComposeSheet
              permissions={{
                direct: canSendDirect,
                broadcast: canBroadcast,
                club: canSendClub,
              }}
              clubTargets={clubTargets}
              clubTargetsLoadError={clubTargetsLoadError}
              defaultOpen={composeOpen}
              defaultType={composeType}
            />
          ) : undefined
        }
      />
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">
            {t("pageHistory.loadingFallback")}
          </div>
        }
      >
        <NotificationHistoryTable page={page} limit={limit} />
      </Suspense>
    </div>
  );
}
