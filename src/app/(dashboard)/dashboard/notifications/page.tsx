import { redirect } from "next/navigation";

export default function LegacyNotificationsRedirectPage() {
  redirect("/dashboard/configuration/notifications");
}
