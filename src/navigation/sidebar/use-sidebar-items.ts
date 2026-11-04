"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { usePermissions } from "@/lib/auth/use-permissions";

import type { NavTranslator } from "@/lib/auth/screen-catalog/screen-title";

import { filterSidebarItems } from "./filter-sidebar";
import { localizeSidebarItems } from "./sidebar-i18n";
import { sidebarItems, type NavGroup } from "./sidebar-items";

export function useSidebarItems(): NavGroup[] {
  const tNav = useTranslations("nav") as unknown as NavTranslator;
  const { subject } = useScreenAccess();
  const { isPastorOnly } = usePermissions();

  return useMemo(
    () =>
      localizeSidebarItems(
        filterSidebarItems(sidebarItems, { ...subject, pastorOnly: isPastorOnly }),
        tNav,
      ),
    [subject, isPastorOnly, tNav],
  );
}
