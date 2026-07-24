import { redirect } from "next/navigation";

export default function LegacyNotificationsHistoryRedirectPage() {
  redirect("/dashboard/configuration/notifications/history");
}
