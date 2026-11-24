import { redirect } from "next/navigation";

/** Notifications left Configuración: one page at /dashboard/notifications. */
export default function ConfigurationNotificationsRedirectPage() {
  redirect("/dashboard/notifications");
}
