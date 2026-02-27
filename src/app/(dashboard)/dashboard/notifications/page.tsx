import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import {
  DirectNotificationForm,
  BroadcastNotificationForm,
  ClubNotificationForm,
} from "@/components/notifications/notification-forms";

export default async function NotificationsPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones"
        description="Envío de notificaciones push a usuarios."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <DirectNotificationForm />
        <BroadcastNotificationForm />
        <div className="lg:col-span-2">
          <ClubNotificationForm />
        </div>
      </div>
    </div>
  );
}
