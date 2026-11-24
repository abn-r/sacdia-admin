import { getTranslations } from "next-intl/server";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { RouteFormModal } from "@/components/shared/form-modal";
import { NotificationComposeForm } from "@/components/notifications/notification-compose-form";
import { requireAdminUser } from "@/lib/auth/session";
import { parseComposeAudience } from "@/lib/notifications/compose";
import { loadNotificationComposeData } from "@/lib/notifications/compose-data";

export default async function NewNotificationModal({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("people.community.notifications.compose");
  const data = await loadNotificationComposeData(user);

  if (!data) {
    return <FormModalForbidden title={t("title")} description={t("description")} />;
  }

  const raw = await searchParams;
  const type = typeof raw.type === "string" ? raw.type : undefined;

  return (
    <RouteFormModal title={t("title")} description={t("description")} className="sm:max-w-xl">
      <NotificationComposeForm data={data} initialAudience={parseComposeAudience(type)} />
    </RouteFormModal>
  );
}
