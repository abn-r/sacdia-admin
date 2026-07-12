import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";
import {
  NOTIFICATIONS_BROADCAST,
  NOTIFICATIONS_CLUB,
  NOTIFICATIONS_SEND,
} from "@/lib/auth/permissions";
import { listAuthorizedNotificationClubTargets } from "@/lib/notifications/club-targets";
import {
  DirectNotificationForm,
  BroadcastNotificationForm,
  ClubNotificationForm,
} from "@/components/notifications/notification-forms";

export default async function NotificationsPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("notifications");
  const canSendDirect = hasPermission(user, NOTIFICATIONS_SEND);
  const canBroadcast = hasPermission(user, NOTIFICATIONS_BROADCAST);
  const canSendClub = hasPermission(user, NOTIFICATIONS_CLUB);

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

  const hasAnyForm = canSendDirect || canBroadcast || canSendClub;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />
      {hasAnyForm ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {canSendDirect ? <DirectNotificationForm /> : null}
          {canBroadcast ? <BroadcastNotificationForm /> : null}
          {canSendClub ? (
            <div className="lg:col-span-2">
              <ClubNotificationForm
                clubTargets={clubTargets}
                clubTargetsLoadError={clubTargetsLoadError}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {t("page.description")}
        </div>
      )}
    </div>
  );
}
