import { redirect } from "next/navigation";
import {
  buildRefreshPath,
  canAttemptSessionRefresh,
  getCurrentUser,
} from "@/lib/auth/session";
import { hasAdminRole } from "@/lib/auth/roles";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (user && hasAdminRole(user)) {
    redirect("/dashboard");
  }

  if (!user && (await canAttemptSessionRefresh())) {
    redirect(buildRefreshPath("/dashboard"));
  }

  return <>{children}</>;
}
