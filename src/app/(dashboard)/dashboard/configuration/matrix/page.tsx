import { redirect } from "next/navigation";
import { legacyMatrixHref } from "@/lib/rbac/roles-view";

/** Old matrix route (bookmarks): now the "Por rol" tab of Roles y permisos. */
export default async function LegacyMatrixPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(legacyMatrixHref(await searchParams));
}
