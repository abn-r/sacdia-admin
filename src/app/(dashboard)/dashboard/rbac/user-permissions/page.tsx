import { redirect } from "next/navigation";
import { legacyUserPermissionsHref } from "@/lib/rbac/roles-view";

/** Old direct-permissions route (bookmarks): now a tab of Roles y permisos. */
export default function LegacyUserPermissionsPage() {
  redirect(legacyUserPermissionsHref());
}
