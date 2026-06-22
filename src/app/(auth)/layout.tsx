import { redirect } from "next/navigation";
import {
  buildRefreshPath,
  getCurrentUser,
  hasRefreshToken,
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

  if (!user && (await hasRefreshToken())) {
    redirect(buildRefreshPath("/dashboard"));
  }

  return <>{children}</>;
}
