import { cookies } from "next/headers";
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
          <AppSidebar />
          <SidebarInset>
            <AppHeader />
            <main className="flex-1 overflow-auto">
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
