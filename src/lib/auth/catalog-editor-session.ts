import { canAccessCatalogEditor } from "@/lib/auth/catalog-editor-access";
import { requireAdminUser } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/auth/types";

export async function loadCatalogEditorSession(): Promise<{
  user: AuthUser;
  allowed: boolean;
}> {
  const user = await requireAdminUser();
  return { user, allowed: canAccessCatalogEditor(user) };
}
