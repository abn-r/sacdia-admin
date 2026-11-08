import type { CSSProperties, ReactNode } from "react";

import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import { AppSidebar } from "@/app/(dashboard)/dashboard/_components/sidebar/app-sidebar";
import { HeaderUserMenu } from "@/app/(dashboard)/dashboard/_components/sidebar/header-user-menu";
import { SearchDialog } from "@/app/(dashboard)/dashboard/_components/sidebar/search-dialog";
import { ThemeSwitcher } from "@/app/(dashboard)/dashboard/_components/sidebar/theme-switcher";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { TerritoryUnconfigured } from "@/components/shared/territory-unconfigured";
import { AuthProvider } from "@/lib/auth/auth-context";
import { QueryProvider } from "@/lib/providers/query-provider";
import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import { requireAdminUser } from "@/lib/auth/session";
import { isTerritoryUnconfigured } from "@/lib/auth/territory-scope";
import {
  getClientMessageNamespacesForDashboardPath,
  pickMessages,
} from "@/lib/i18n/client-messages";
import { loadSidebarInsights } from "@/lib/dashboard/sidebar-insights";
import { cn } from "@/lib/utils";
import { getPreference } from "@/server/server-actions";

export default async function DashboardLayout({
  children,
  modal,
}: Readonly<{ children: ReactNode; modal: ReactNode }>) {
  const initialUser = await requireAdminUser();
  const cookieStore = await cookies();
  const headerStore = await headers();
  const pathname =
    headerStore.get("x-sacdia-pathname") ??
    headerStore.get("x-pathname") ??
    "";
  // A territorial or admin role without a territory gets 403 from every scoped
  // API call, so block the whole panel with an explanation instead.
  const territoryUnconfigured = isTerritoryUnconfigured(initialUser);
  // `pathname` is the URL of the request that rendered this layout. Layouts do
  // not re-render on soft navigation, so when an intercepted route opens the
  // `@modal` slot client-side this value is stale (it still names the page
  // underneath). The slot gate below therefore only covers hard loads; every
  // page in `@modal/(.)dashboard/**` gates itself with `canCapability`.
  const canOpenPage = canAccessDashboardPath(initialUser, pathname);
  // Not awaited: scope name and queue counts stream into the sidebar after the
  // page renders. loadSidebarInsights never rejects.
  const sidebarInsights = territoryUnconfigured ? undefined : loadSidebarInsights();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const [variant, collapsible, locale, messages] = await Promise.all([
    getPreference("sidebar_variant"),
    getPreference("sidebar_collapsible"),
    getLocale(),
    getMessages(),
  ]);
  const skipLabel = (await getTranslations("nav.a11y"))("skipToContent");
  const clientMessages = pickMessages(
    messages,
    getClientMessageNamespacesForDashboardPath("/dashboard", messages),
  );

  return (
    <NextIntlClientProvider locale={locale} messages={clientMessages}>
    <AuthProvider initialUser={initialUser}>
      <QueryProvider>
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 68)",
          } as CSSProperties
        }
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:ring-2 focus:ring-ring focus:outline-none"
        >
          {skipLabel}
        </a>
        {territoryUnconfigured ? null : (
          <AppSidebar variant={variant} collapsible={collapsible} insights={sidebarInsights} />
        )}
        <SidebarInset
          className={cn(
            "[html[data-content-layout=centered]_&>*]:mx-auto",
            "[html[data-content-layout=centered]_&>*]:w-full",
            "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
            "peer-data-[variant=inset]:border",
            "[--dashboard-header-height:--spacing(12)]",
            "min-w-0 overflow-x-clip",
          )}
        >
          <header
            className={cn(
              "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] duration-200 ease-[var(--ease-drawer)] motion-reduce:transition-none group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
              "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
            )}
          >
            <div className="flex w-full items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-1 lg:gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
                />
                <SearchDialog />
              </div>
              <div className="flex items-center gap-2">
                <ThemeSwitcher />
                <HeaderUserMenu />
              </div>
            </div>
          </header>
          <main
            id="main-content"
            tabIndex={-1}
            className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 outline-none has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0"
          >
            {territoryUnconfigured ? (
              <TerritoryUnconfigured />
            ) : canOpenPage ? (
              children
            ) : (
              <PageAccessForbidden />
            )}
          </main>
          {territoryUnconfigured || !canOpenPage ? null : modal}
        </SidebarInset>
      </SidebarProvider>
      </QueryProvider>
    </AuthProvider>
    </NextIntlClientProvider>
  );
}
