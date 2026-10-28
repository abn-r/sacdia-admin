"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  verifyEmailAction,
  type VerifyEmailState,
} from "@/lib/auth/verify-email-action";
import { BrandMark, StatusMessage } from "@/components/auth/public-auth-parts";
import { Button } from "@/components/ui/button";
import { PAGE_ENTER_CLASSES } from "@/lib/animations";
import { cn } from "@/lib/utils";

const initialState: VerifyEmailState = {};

function SubmitButton() {
  const t = useTranslations("auth.verify_email");
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      size="lg"
      className="w-full gap-2 text-sm font-semibold"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {t("submit_loading")}
        </>
      ) : (
        t("submit_idle")
      )}
    </Button>
  );
}

/**
 * Page behind the link in the verification email
 * (`{ADMIN_PANEL_URL}/verify-email?token=...`). The token is only spent when
 * the person presses the button: mail scanners that open links on their own
 * must not verify the address for them.
 */
export function VerifyEmailForm({ token }: { token: string }) {
  const t = useTranslations("auth.verify_email");
  const tBrand = useTranslations("auth.reset_password");
  const [state, formAction] = useActionState(verifyEmailAction, initialState);

  let content: React.ReactNode;
  if (state.success) {
    content = (
      <StatusMessage
        tone="success"
        title={t("success_title")}
        body={t("success_body")}
      />
    );
  } else if (!token || state.linkInvalid) {
    content = (
      <StatusMessage
        tone="error"
        title={t("invalid_title")}
        body={t("invalid_body")}
      />
    );
  } else {
    content = (
      <>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          {t("description")}
        </p>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />

          {state.error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive dark:border-destructive/30 dark:bg-destructive/10"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <SubmitButton />
        </form>
      </>
    );
  }

  return (
    <div className={cn("w-full max-w-[380px]", PAGE_ENTER_CLASSES)}>
      <BrandMark subtitle={tBrand("brand_subtitle")} />
      {content}
    </div>
  );
}
