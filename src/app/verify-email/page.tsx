import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verify_email");
  return {
    title: t("meta_title"),
    // The token travels in the URL: keep it out of search engines and out of
    // the Referer header of any request the page makes.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

/**
 * Target of the verification email (`{ADMIN_PANEL_URL}/verify-email?token=...`).
 * Outside the `(auth)` group for the same reason as `/reset-password`: it must
 * work for anyone, signed in or not.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token.trim() : "";

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-background px-6 py-12 sm:px-10">
      <VerifyEmailForm token={value} />
    </main>
  );
}
