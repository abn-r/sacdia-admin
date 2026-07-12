"use client";

import { useActionState } from "react";
import type { MouseEventHandler } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  expireOverdueClassEnrollmentsAction,
  type ClassExpirationActionState,
} from "@/lib/classes/actions";

type YearOption = {
  ecclesiastical_year_id: number;
  name: string;
  active?: boolean;
};

interface ClassExpirationCardProps {
  ecclesiasticalYears: YearOption[];
}

function SubmitButton({
  dryRun,
  label,
  disabled = false,
  onClick,
}: {
  dryRun: boolean;
  label: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="dry_run"
      value={dryRun ? "true" : "false"}
      variant={dryRun ? "outline" : "default"}
      disabled={pending || disabled}
      onClick={onClick}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function ClassExpirationCard({ ecclesiasticalYears }: ClassExpirationCardProps) {
  const t = useTranslations("classes.expiration");
  const [state, action, pending] = useActionState<ClassExpirationActionState, FormData>(
    expireOverdueClassEnrollmentsAction,
    {},
  );
  const defaultYearId =
    ecclesiasticalYears.find((year) => year.active)?.ecclesiastical_year_id ??
    ecclesiasticalYears[0]?.ecclesiastical_year_id;
  const canApply = state.result?.dry_run === true;
  const confirmApplyMessage = t("confirmApply", {
    expired: state.result?.expired_count ?? 0,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} aria-busy={pending} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(220px,1fr)_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="class-expiration-year">{t("yearLabel")}</Label>
              <select
                id="class-expiration-year"
                name="ecclesiastical_year_id"
                defaultValue={defaultYearId ? String(defaultYearId) : ""}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t("currentYearOption")}</option>
                {ecclesiasticalYears.map((year) => (
                  <option
                    key={year.ecclesiastical_year_id}
                    value={String(year.ecclesiastical_year_id)}
                  >
                    {year.name || `Año #${year.ecclesiastical_year_id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <SubmitButton dryRun={true} label={t("dryRun")} />
              <SubmitButton
                dryRun={false}
                label={t("apply")}
                disabled={!canApply}
                onClick={(event) => {
                  if (!window.confirm(confirmApplyMessage)) {
                    event.preventDefault();
                  }
                }}
              />
            </div>
          </div>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.result && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {t("result", {
                scanned: state.result.scanned_count,
                expired: state.result.expired_count,
                mode: state.result.dry_run ? t("modeDryRun") : t("modeApply"),
              })}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
