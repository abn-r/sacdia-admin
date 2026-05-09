import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { AuthProvider } from "@/lib/auth/auth-context";
import { QueryProvider } from "@/lib/providers/query-provider";
import { requireAdminUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();

  const t = await getTranslations("nav.a11y");
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarState !== "false";

  return (
    <AuthProvider>
      <QueryProvider>
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
          <AppSidebar />
          <SidebarInset>
            <AppHeader />
            <main id="main" className="flex-1 overflow-auto">
              <div className="mx-auto max-w-[1536px] px-4 py-4 md:px-6 md:py-6">
                {children}
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </QueryProvider>
    </AuthProvider>
  );
}
