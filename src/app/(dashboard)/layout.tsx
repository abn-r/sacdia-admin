import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { CommandPalette } from "@/components/layout/command-palette";
import { BirthdayCelebrationModal } from "@/components/dashboard/birthday-celebration-modal";
import { AuthProvider } from "@/lib/auth/auth-context";
import { QueryProvider } from "@/lib/providers/query-provider";
import { ActiveContextProvider } from "@/lib/context/active-context";
import { requireAdminUser } from "@/lib/auth/session";
import {
  getClientMessageNamespacesForDashboardPath,
  pickMessages,
} from "@/lib/i18n/client-messages";
import { cn } from "@/lib/utils";
import { getPreference } from "@/server/preferences";
import { V1PanelPathProvider } from "@/lib/v2/panel-path-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await requireAdminUser();

  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("nav.a11y");
  const cookieStore = await cookies();
  const clientMessages = pickMessages(
    messages,
    getClientMessageNamespacesForDashboardPath("/dashboard", messages),
  );
  const sidebarState = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarState !== "false";
  const [variant, collapsible] = await Promise.all([
    getPreference("sidebar_variant"),
    getPreference("sidebar_collapsible"),
  ]);

  return (
    <NextIntlClientProvider locale={locale} messages={clientMessages}>
      <AuthProvider initialUser={initialUser}>
        <QueryProvider>
          <V1PanelPathProvider>
          <SidebarProvider
            defaultOpen={defaultOpen}
            style={
              {
                "--sidebar-width": "15rem",
              } as React.CSSProperties
            }
          >
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-background focus:px-3 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-ring"
            >
              {t("skipToContent")}
            </a>
            <AppSidebar variant={variant} collapsible={collapsible} />
            <SidebarInset
              className={cn(
                "peer-data-[variant=inset]:border",
                "min-w-0 overflow-x-clip",
              )}
            >
              <ActiveContextProvider>
                <CommandPalette />
                <BirthdayCelebrationModal />
                <AppHeader />
                <main id="main" className="flex-1 overflow-auto">
                  <div
                    className={cn(
                      "px-4 py-4 md:px-6 md:py-6",
                      "[html[data-content-layout=centered]_&]:mx-auto",
                      "[html[data-content-layout=centered]_&]:w-full",
                      "[html[data-content-layout=centered]_&]:max-w-[1536px]",
                      "[html[data-content-layout=full-width]_&]:w-full",
                    )}
                  >
                    {children}
                  </div>
                </main>
              </ActiveContextProvider>
            </SidebarInset>
          </SidebarProvider>
          </V1PanelPathProvider>
        </QueryProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
