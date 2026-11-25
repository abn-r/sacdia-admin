"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from "@/lib/auth/forgot-password-action";
import { AuthCard, BrandMark } from "@/components/auth/public-auth-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ForgotPasswordState = {};

function SubmitButton() {
  const t = useTranslations("admin.access.forgot");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="lg" className="w-full gap-2 text-sm font-semibold">
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {t("submitLoading")}
        </>
      ) : (
        t("submit")
      )}
    </Button>
  );
}

/**
 * Public request for a password reset link. The success message is the same
 * for every well-formed address: it never says whether the account exists.
 */
export function ForgotPasswordForm() {
  const t = useTranslations("admin.access.forgot");
  const tBrand = useTranslations("auth.login");
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  return (
    <AuthCard>
      <BrandMark subtitle={tBrand("brand_subtitle")} />
      {state.sent ? (
        <div role="status" className="space-y-3">
          <MailCheck className="size-8 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("sentTitle")}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("sentBody")}</p>
          <p className="pt-3 text-center text-sm">
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t("backToLogin")}
            </Link>
          </p>
        </div>
      ) : (
        <>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{t("description")}</p>

          <form action={formAction} className="flex flex-col gap-4">
            {state.error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive dark:border-destructive/30 dark:bg-destructive/10"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold tracking-tight">
                {t("emailLabel")}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                maxLength={254}
                className="h-11"
              />
            </div>

            <SubmitButton />
          </form>

          <p className="mt-5 text-center text-sm">
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t("backToLogin")}
            </Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}
