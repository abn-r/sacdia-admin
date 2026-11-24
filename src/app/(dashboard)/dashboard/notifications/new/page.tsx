import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { NotificationComposeForm } from "@/components/notifications/notification-compose-form";
import { requireAdminUser } from "@/lib/auth/session";
import { parseComposeAudience } from "@/lib/notifications/compose";
import { loadNotificationComposeData } from "@/lib/notifications/compose-data";
import NotificationsPage from "../page";

/**
 * Direct load / refresh of /notifications/new: the sent history renders
 * underneath and the compose form opens as the same modal the intercepted
 * route shows.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("people.community.notifications.compose");
  return { title: t("title") };
}

export default async function NewNotificationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdminUser();
  const data = await loadNotificationComposeData(user);
  if (!data) redirect("/dashboard/notifications");

  const t = await getTranslations("people.community.notifications.compose");
  const raw = await searchParams;
  const type = typeof raw.type === "string" ? raw.type : undefined;

  return (
    <>
      <NotificationsPage searchParams={Promise.resolve({})} />
      <RouteFormModal
        dismissHref="/dashboard/notifications"
        title={t("title")}
        description={t("description")}
        className="sm:max-w-xl"
      >
        <NotificationComposeForm data={data} initialAudience={parseComposeAudience(type)} />
      </RouteFormModal>
    </>
  );
}
