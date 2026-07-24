import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function ConfigurationNotificationsSendPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const type =
    params.type === "direct" ||
    params.type === "broadcast" ||
    params.type === "club"
      ? params.type
      : "direct";

  redirect(
    `/dashboard/configuration/notifications/history?compose=1&type=${type}`,
  );
}
