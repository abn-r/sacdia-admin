import { redirect } from "next/navigation";
import { parseComposeAudience } from "@/lib/notifications/compose";

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

/** Sending is the compose modal at /dashboard/notifications/new. Old `?type=direct|broadcast|club` links keep working. */
export default async function ConfigurationNotificationsSendRedirectPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const audience = parseComposeAudience(params.type);
  redirect(
    audience
      ? `/dashboard/notifications/new?type=${audience}`
      : "/dashboard/notifications/new",
  );
}
