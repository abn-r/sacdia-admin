import { requireAdminUser } from "@/lib/auth/session";

export default async function MaterialesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();
  return <>{children}</>;
}
