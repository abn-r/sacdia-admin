"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { RailLayout, type RailGroup } from "@/components/shared/rail-layout";
import { isCatalogDetailPath } from "@/lib/catalogs/rail-groups";

interface CatalogsShellProps {
  groups: RailGroup[];
  title: string;
  description: string;
  ariaLabel: string;
  children: ReactNode;
}

/**
 * Catalogs frame: page title plus the grouped rail on the left and the selected
 * catalog on the right. Detail pages (class, master honor, certification) have
 * their own header and render without the rail.
 */
export function CatalogsShell({ groups, title, description, ariaLabel, children }: CatalogsShellProps) {
  const pathname = usePathname();
  if (isCatalogDetailPath(pathname)) return <>{children}</>;

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <RailLayout groups={groups} ariaLabel={ariaLabel}>
        {children}
      </RailLayout>
    </div>
  );
}
