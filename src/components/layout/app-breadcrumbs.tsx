"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";

// Segments that have a known translation key in nav.breadcrumbs
const TRANSLATED_SEGMENTS = new Set([
  "dashboard", "users", "catalogs", "geography", "countries", "unions",
  "local-fields", "districts", "churches", "allergies", "diseases",
  "medicines", "relationship-types", "ecclesiastical-years", "club-types",
  "club-ideals", "honor-categories", "clubs", "new", "instances",
  "camporees", "classes", "honors", "activities", "finances", "inventory",
  "certifications", "insurance", "notifications", "folders", "rbac",
  "permissions", "roles", "matrix",
]);

export function AppBreadcrumbs() {
  const t = useTranslations("nav.breadcrumbs");
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;
    // Translate known segments; fall back to raw segment for dynamic IDs / unknown routes
    const label = TRANSLATED_SEGMENTS.has(segment)
      ? t(segment as Parameters<typeof t>[0])
      : segment;
    return { label, href, isLast };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
