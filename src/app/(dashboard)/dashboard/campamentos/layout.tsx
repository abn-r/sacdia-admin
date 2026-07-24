import { requireAdminUser } from "@/lib/auth/session";

export default async function CampamentosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();
  return <>{children}</>;
}
