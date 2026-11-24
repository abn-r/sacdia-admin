import { redirect } from "next/navigation";
import { parseComposeAudience } from "@/lib/notifications/compose";

interface PageProps {
  searchParams: Promise<{ page?: string; limit?: string; compose?: string; type?: string }>;
}

/** History became the first tab of /dashboard/notifications; `?compose=1` opens the compose modal. */
export default async function ConfigurationNotificationsHistoryRedirectPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  if (params.compose === "1") {
    const audience = parseComposeAudience(params.type);
    redirect(
      audience
        ? `/dashboard/notifications/new?type=${audience}`
        : "/dashboard/notifications/new",
    );
  }

  const qs = new URLSearchParams();
  if (params.page) qs.set("page", params.page);
  if (params.limit) qs.set("limit", params.limit);
  const suffix = qs.toString();
  redirect(suffix ? `/dashboard/notifications?${suffix}` : "/dashboard/notifications");
}
