import { redirect } from "next/navigation";

/**
 * Target of the e-mail link ({ADMIN_PANEL_URL}/investiture-requests/{requestId}).
 * It stays outside /dashboard on purpose: the dashboard subtree owns the
 * authentication gate (src/proxy.ts), so a signed-out user is sent to login
 * with `next` pointing at the real detail route.
 */
export default async function InvestitureRequestLinkPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  redirect(`/dashboard/investiture-requests/${encodeURIComponent(requestId)}`);
}
