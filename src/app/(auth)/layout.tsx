import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
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

  return <>{children}</>;
}
