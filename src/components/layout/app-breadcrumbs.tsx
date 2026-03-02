"use client";

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

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Usuarios",
  catalogs: "Catálogos",
  geography: "Geografía",
  countries: "Países",
  unions: "Uniones",
  "local-fields": "Campos locales",
  districts: "Distritos",
  churches: "Iglesias",
  allergies: "Alergias",
  diseases: "Enfermedades",
  "relationship-types": "Tipos de relación",
  "ecclesiastical-years": "Años eclesiásticos",
  "club-types": "Tipos de club",
  "club-ideals": "Ideales de club",
  "honor-categories": "Categorías de especialidades",
  clubs: "Clubes",
  new: "Nuevo",
  instances: "Instancias",
  camporees: "Camporees",
  classes: "Clases",
  honors: "Especialidades",
  activities: "Actividades",
  finances: "Finanzas",
  inventory: "Inventario",
  certifications: "Certificaciones",
  insurance: "Seguros",
  notifications: "Notificaciones",
  folders: "Folders",
  rbac: "Roles y permisos",
  permissions: "Permisos",
  roles: "Roles",
  matrix: "Matriz",
};

function getLabel(segment: string): string {
  return labelMap[segment] ?? segment;
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;
    return { label: getLabel(segment), href, isLast };
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
