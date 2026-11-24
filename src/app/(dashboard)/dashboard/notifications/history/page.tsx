import { redirect } from "next/navigation";

/** The sent history is the first tab of /dashboard/notifications. */
export default async function LegacyNotificationsHistoryRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const qs = new URLSearchParams();
  for (const key of ["page", "limit"]) {
    const value = raw[key];
    if (typeof value === "string" && value) qs.set(key, value);
  }
  const suffix = qs.toString();
  redirect(suffix ? `/dashboard/notifications?${suffix}` : "/dashboard/notifications");
}
