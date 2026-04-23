"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/lib/auth/actions";
import type { AuthActionState } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function SubmitButton() {
  const t = useTranslations("auth.login");
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full"
      size="lg"
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          {t("submit_loading")}
        </>
      ) : (
        t("submit_idle")
      )}
    </Button>
  );
}

const initialState: AuthActionState = {};

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const [state, formAction] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative min-h-svh overflow-hidden bg-background flex items-center justify-center p-4">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
        aria-hidden="true"
      />

      {/* Ambient glow — top left */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 size-[480px] rounded-full bg-primary/10 dark:bg-primary/15 blur-3xl"
        aria-hidden="true"
      />

      {/* Ambient glow — bottom right */}
      <div
        className="pointer-events-none absolute -bottom-32 -right-32 size-[360px] rounded-full bg-primary/8 dark:bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className={cn(
          "relative z-10 w-full max-w-sm",
          "animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
        )}
      >
        {/* Brand header — outside the card */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm">
            <Image
              src="/svg/LogoSACDIA.svg"
              alt="SACDIA"
              width={28}
              height={28}
              priority
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              SACDIA
            </p>
            <p className="text-[11px] tracking-wide text-muted-foreground/60">
              {t("brand_subtitle")}
            </p>
          </div>
        </div>

        {/* Card body */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm px-8 py-8">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {t("welcome_title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("welcome_description")}
            </p>
          </div>

          {/* Form */}
          <form action={formAction} className="space-y-4">
            {/* Error message */}
            {state.error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive dark:border-destructive/30 dark:bg-destructive/10">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                {t("email_label")}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("email_placeholder")}
                required
                autoComplete="email"
                autoFocus
                className="h-10"
              />
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                {t("password_label")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  minLength={8}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? t("hide_password") : t("show_password")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <SubmitButton />
            </div>
          </form>
        </div>

        {/* Bible verse — outside the card, below */}
        <p className="mt-6 text-center text-[11px] italic text-muted-foreground/40 dark:text-muted-foreground/30">
          {t("verse")}
        </p>
      </div>
    </div>
  );
}
