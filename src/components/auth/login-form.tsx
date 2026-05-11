"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Loader2, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/lib/auth/actions";
import type { AuthActionState } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};

function SubmitButton() {
  const t = useTranslations("auth.login");
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      size="lg"
      className="group w-full gap-2 text-sm font-semibold"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {t("submit_loading")}
        </>
      ) : (
        <>
          {t("submit_idle")}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </Button>
  );
}

type Props = {
  nextParam: string;
};

export function LoginForm({ nextParam }: Props) {
  const t = useTranslations("auth.login");
  const [state, formAction] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div
      className={cn(
        "w-full max-w-[380px]",
        "animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
      )}
    >
      {/* Mobile-only brand mark above form */}
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="grid size-10 place-items-center rounded-xl border border-border bg-card shadow-xs">
          <Image
            src="/svg/LogoSACDIA.svg"
            alt="SACDIA"
            width={22}
            height={22}
            priority
          />
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold tracking-tight text-foreground">
            SACDIA
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("brand_subtitle")}
          </div>
        </div>
      </div>

      <div className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        {t("eyebrow")}
      </div>

      <h1 className="mb-2 text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-3xl">
        {t("welcome_title")}
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        {t("welcome_description")}
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={nextParam} />

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
          <Label
            htmlFor="email"
            className="text-xs font-semibold tracking-tight"
          >
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
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs font-semibold tracking-tight"
          >
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
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? t("hide_password") : t("show_password")
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
