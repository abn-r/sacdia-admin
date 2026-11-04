import { redirect } from "next/navigation";
import {
  buildRefreshPath,
  canAttemptSessionRefresh,
  getCurrentUser,
} from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/auth/permission-utils";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (user && canAccessAdminPanel(user)) {
    redirect("/dashboard");
  }

  if (!user && (await canAttemptSessionRefresh())) {
    redirect(buildRefreshPath("/dashboard"));
  }

  return <>{children}</>;
}
