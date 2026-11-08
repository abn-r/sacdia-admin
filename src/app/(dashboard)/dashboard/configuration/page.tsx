import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Grid3X3, Key, Settings2, Trophy, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav.items");
  return { title: t("configuration") };
}

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <section.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {section.title}
                </CardTitle>
                <CardDescription className="text-xs">{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
