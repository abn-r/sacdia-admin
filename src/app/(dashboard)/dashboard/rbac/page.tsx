import Link from "next/link";
import { Shield, Key, Users, Grid3X3, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";

export default async function RbacPage() {
  const t = await getTranslations("rbac.pages.root");
  await requireAdminUser();

  const rbacSections = [
    {
      title: t("sectionPermissions"),
      description: t("sectionPermissionsDesc"),
      href: "/dashboard/rbac/permissions",
      icon: Key,
    },
    {
      title: t("sectionRoles"),
      description: t("sectionRolesDesc"),
      href: "/dashboard/rbac/roles",
      icon: Users,
    },
    {
      title: t("sectionUserPermissions"),
      description: t("sectionUserPermissionsDesc"),
      href: "/dashboard/rbac/user-permissions",
      icon: ShieldCheck,
    },
    {
      title: t("sectionMatrix"),
      description: t("sectionMatrixDesc"),
      href: "/dashboard/rbac/matrix",
      icon: Grid3X3,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
