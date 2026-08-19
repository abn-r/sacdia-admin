import type { ReactNode } from "react";
import { headers } from "next/headers";

import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import {
  canAccessCatalogEditor,
  isCatalogEditorPath,
} from "@/lib/auth/catalog-editor-access";
import { requireAdminUser } from "@/lib/auth/session";

export default async function CatalogsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdminUser();
  const headerStore = await headers();
  const pathname =
    headerStore.get("x-sacdia-pathname") ??
    headerStore.get("x-pathname") ??
    "";

  if (isCatalogEditorPath(pathname) && !canAccessCatalogEditor(user)) {
    return <CatalogEditorForbidden />;
  }

  return children;
}
