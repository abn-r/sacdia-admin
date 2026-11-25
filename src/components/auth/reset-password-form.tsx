"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, MinusCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  resetPasswordAction,
  type ResetPasswordState,
} from "@/lib/auth/reset-password-action";
import { AuthCard, BrandMark, StatusMessage } from "@/components/auth/public-auth-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordRequirements } from "@/lib/auth/password-policy";
import { cn } from "@/lib/utils";

const initialState: ResetPasswordState = {};

export type ResetPasswordVariant = "reset" | "invitation";

function SubmitButton({
  variant,
  disabled = false,
}: {
  variant: ResetPasswordVariant;
  disabled?: boolean;
}) {
  const t = useTranslations("auth.reset_password");
  const { pending } = useFormStatus();
  const invitation = variant === "invitation";
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      size="lg"
      className="w-full gap-2 text-sm font-semibold"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {invitation ? t("invitation.submit_loading") : t("submit_loading")}
        </>
      ) : invitation ? (
        t("invitation.submit_idle")
      ) : (
        t("submit_idle")
      )}
    </Button>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoFocus,
  describedBy,
}: {
  id: "password" | "confirm";
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  describedBy?: string;
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
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy}
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

function RequirementList({ value, id }: { value: string; id: string }) {
  const t = useTranslations("admin.access.reset");
  const items = passwordRequirements(value);
  return (
    <ul id={id} className="-mt-1 space-y-1.5" aria-label={t("requirementsLabel")}>
      {items.map((item) => {
        const Icon = item.met ? CheckCircle2 : MinusCircle;
        return (
          <li
            key={item.id}
            data-met={item.met}
            className={cn(
              "flex items-center gap-2 text-sm",
              item.met ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn("size-4 shrink-0", item.met ? "text-primary" : "text-muted-foreground/60")}
            />
            <span>{t(`requirements.${item.id}`)}</span>
            <span className="sr-only">{item.met ? t("requirementMet") : t("requirementPending")}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Where "Abrir la app" points; the button is hidden until the link is configured. */
const MOBILE_APP_URL = process.env.NEXT_PUBLIC_MOBILE_APP_URL?.trim() ?? "";

function ActivatedActions() {
  const t = useTranslations("admin.access.reset");
  return (
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
      <Button asChild size="lg" className="flex-1">
        <Link href="/login">{t("goToPanel")}</Link>
      </Button>
      {MOBILE_APP_URL ? (
        <Button asChild size="lg" variant="outline" className="flex-1">
          <a href={MOBILE_APP_URL}>{t("openApp")}</a>
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Form behind the link in the password reset email
 * (`{ADMIN_PANEL_URL}/reset-password?token=...`) and behind the admin
 * invitation (`variant="invitation"`, `...&mode=invitation`). Anyone with an
 * account lands here, not only administrators.
 */
export function ResetPasswordForm({
  token,
  variant = "reset",
}: {
  token: string;
  variant?: ResetPasswordVariant;
}) {
  const t = useTranslations("auth.reset_password");
  const invitation = variant === "invitation";
  const [state, formAction] = useActionState(resetPasswordAction, initialState);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const tReset = useTranslations("admin.access.reset");
  const requirementsMet = passwordRequirements(password).every((item) => item.met);
  const mismatch = confirm.length > 0 && confirm !== password;

  let content: React.ReactNode;
  if (state.success) {
    content = (
      <>
        <StatusMessage
          tone="success"
          title={invitation ? t("invitation.success_title") : t("success_title")}
          body={invitation ? tReset("activatedBody") : tReset("resetDoneBody")}
        />
        <ActivatedActions />
      </>
    );
  } else if (!token || state.linkInvalid) {
    content = (
      <StatusMessage
        tone="error"
        title={invitation ? t("invitation.invalid_title") : t("invalid_title")}
        body={invitation ? t("invitation.invalid_body") : t("invalid_body")}
      />
    );
  } else {
    content = (
      <>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          {invitation ? t("invitation.title") : t("title")}
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          {invitation ? tReset("invitationDescription") : tReset("resetDescription")}
        </p>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="mode" value={variant} />

          {state.error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive dark:border-destructive/30 dark:bg-destructive/10"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <PasswordField
            id="password"
            label={t("password_label")}
            value={password}
            onChange={setPassword}
            autoFocus
            describedBy="password-requirements"
          />
          <RequirementList value={password} id="password-requirements" />
          <PasswordField
            id="confirm"
            label={t("confirm_label")}
            value={confirm}
            onChange={setConfirm}
            describedBy={mismatch ? "confirm-mismatch" : undefined}
          />
          {mismatch && (
            <p id="confirm-mismatch" role="alert" className="-mt-2 text-xs text-destructive">
              {t("errors.mismatch")}
            </p>
          )}

          <div className="pt-2">
            <SubmitButton variant={variant} disabled={!requirementsMet || mismatch || confirm.length === 0} />
          </div>
        </form>
      </>
    );
  }

  return (
    <AuthCard>
      <BrandMark subtitle={t("brand_subtitle")} />
      {content}
    </AuthCard>
  );
}
