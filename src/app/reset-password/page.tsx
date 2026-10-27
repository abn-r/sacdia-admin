import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset_password");
  return {
    title: t("meta_title"),
    // The token travels in the URL: keep it out of search engines and out of
    // the Referer header of any request the page makes.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

/**
 * Target of the password reset email
 * (`{ADMIN_PANEL_URL}/reset-password?token=...`). It sits outside the
 * `(auth)` group on purpose: that layout redirects signed-in admins to the
 * dashboard, and this page must work for anyone, signed in or not.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token.trim() : "";

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-background px-6 py-12 sm:px-10">
      <ResetPasswordForm token={value} />
    </main>
  );
}
