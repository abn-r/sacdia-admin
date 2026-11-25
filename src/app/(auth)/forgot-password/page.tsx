import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.access.forgot");
  return { title: t("metaTitle") };
}

/**
 * Public. Lives in the `(auth)` group like the login: a signed-in admin is
 * sent to the dashboard by the group layout. `proxy.ts` only guards
 * `/dashboard/*`, so nothing else is needed to keep it open.
 */
export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-background px-6 py-12 sm:px-10">
      <ForgotPasswordForm />
    </main>
  );
}
