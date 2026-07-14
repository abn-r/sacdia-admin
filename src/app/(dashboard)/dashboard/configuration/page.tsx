import Link from "next/link";
import { Bell, Grid3X3, Key, Settings2, Trophy, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";

export default async function ConfigurationPage() {
  const tNav = await getTranslations("nav.items");
  const tRbac = await getTranslations("rbac.pages.root");
  const tSettings = await getTranslations("settings.pages.root");
  const tAchievements = await getTranslations("achievements.crud.categories");
  const tNotifications = await getTranslations("configuration.notifications");
  await requireAdminUser();

  const sections = [
    {
      title: tNotifications("title"),
      description: tNotifications("description"),
      href: "/dashboard/configuration/notifications",
      icon: Bell,
    },
    {
      title: tAchievements("pageTitle"),
      description: tAchievements("pageDescription"),
      href: "/dashboard/configuration/achievements",
      icon: Trophy,
    },
    {
      title: tSettings("title"),
      description: tSettings("description"),
      href: "/dashboard/configuration/variables",
      icon: Settings2,
    },
    {
      title: tRbac("sectionPermissions"),
      description: tRbac("sectionPermissionsDesc"),
      href: "/dashboard/configuration/permissions",
      icon: Key,
    },
    {
      title: tRbac("sectionRoles"),
      description: tRbac("sectionRolesDesc"),
      href: "/dashboard/configuration/roles",
      icon: Users,
    },
    {
      title: tRbac("sectionMatrix"),
      description: tRbac("sectionMatrixDesc"),
      href: "/dashboard/configuration/matrix",
      icon: Grid3X3,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={tNav("configuration")}
        description={tRbac("description")}
        breadcrumbs={[{ label: tNav("configuration") }]}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
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
