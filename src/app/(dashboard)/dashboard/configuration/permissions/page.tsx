import { redirect } from "next/navigation";
import { legacyPermissionsHref } from "@/lib/rbac/roles-view";

/** Old permissions route (bookmarks): now the catalog tab of Roles y permisos. */
export default async function LegacyPermissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(legacyPermissionsHref(await searchParams));
}
