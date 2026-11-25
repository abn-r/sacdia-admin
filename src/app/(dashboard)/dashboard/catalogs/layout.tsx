import type { ReactNode } from "react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { CatalogsShell } from "@/components/catalogs/catalogs-shell";
import {
  canAccessCatalogEditor,
  isCatalogEditorPath,
} from "@/lib/auth/catalog-editor-access";
import { requireAdminUser } from "@/lib/auth/session";
import { getCatalogRailGroups } from "@/lib/catalogs/rail-server";

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

  const [tNav, t, groups] = await Promise.all([
    getTranslations("nav"),
    getTranslations("admin.catalogs"),
    getCatalogRailGroups(user),
  ]);

  return (
    <CatalogsShell
      groups={groups}
      title={tNav("items.catalogs_root")}
      description={t("rail.description")}
      ariaLabel={t("rail.ariaLabel")}
    >
      {children}
    </CatalogsShell>
  );
}
