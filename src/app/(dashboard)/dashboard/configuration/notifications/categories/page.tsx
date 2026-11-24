import { redirect } from "next/navigation";

export default function ConfigurationNotificationsCategoriesRedirectPage() {
  redirect("/dashboard/notifications?tab=categories");
}
