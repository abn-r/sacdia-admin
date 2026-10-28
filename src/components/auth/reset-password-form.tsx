"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  resetPasswordAction,
  type ResetPasswordState,
} from "@/lib/auth/reset-password-action";
import { BrandMark, StatusMessage } from "@/components/auth/public-auth-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_ENTER_CLASSES } from "@/lib/animations";
import { cn } from "@/lib/utils";

const initialState: ResetPasswordState = {};

function SubmitButton() {
  const t = useTranslations("auth.reset_password");
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

function PasswordField({
  id,
  label,
  autoFocus,
}: {
  id: "password" | "confirm";
  label: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations("auth.reset_password");
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold tracking-tight">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          required
          autoComplete="new-password"
          autoFocus={autoFocus}
          maxLength={128}
          className="h-11 pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("hide_password") : t("show_password")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

/**
 * Form behind the link in the password reset email
 * (`{ADMIN_PANEL_URL}/reset-password?token=...`). Anyone with an account
 * lands here, not only administrators.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth.reset_password");
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

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

          <PasswordField id="password" label={t("password_label")} autoFocus />
          <p className="-mt-2 text-xs text-muted-foreground">{t("policy_hint")}</p>
          <PasswordField id="confirm" label={t("confirm_label")} />

          <div className="pt-2">
            <SubmitButton />
          </div>
        </form>
      </>
    );
  }

  return (
    <div className={cn("w-full max-w-[380px]", PAGE_ENTER_CLASSES)}>
      <BrandMark subtitle={t("brand_subtitle")} />
      {content}
    </div>
  );
}
