import Link from "next/link";
import { Shield, Key, Users, Grid3X3 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";

const rbacSections = [
  {
    title: "Permisos",
    description: "Catálogo de permisos del sistema",
    href: "/dashboard/rbac/permissions",
    icon: Key,
  },
  {
    title: "Roles",
    description: "Gestión de roles y asignación de permisos",
    href: "/dashboard/rbac/roles",
    icon: Users,
  },
  {
    title: "Matriz de seguridad",
    description: "Vista matricial de roles vs permisos",
    href: "/dashboard/rbac/matrix",
    icon: Grid3X3,
  },
];

export default async function RbacPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles y permisos"
        description="Sistema de control de acceso basado en roles (RBAC)."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {rbacSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <section.icon className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">{section.title}</CardTitle>
                  <CardDescription className="text-xs">{section.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
