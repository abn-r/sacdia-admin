"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({ title, description, children, className }: SettingsSectionProps) {
  return (
    <section className={cn("grid gap-4 border-b py-6 first:pt-0 last:border-b-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8", className)}>
      <div className="space-y-1">
        <h2 className="font-semibold text-base tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      <div className="min-w-0 divide-y rounded-xl border bg-card text-card-foreground">{children}</div>
    </section>
  );
}

export interface SettingsRowProps {
  label: ReactNode;
  description?: ReactNode;
  control: ReactNode;
  className?: string;
}

export function SettingsRow({ label, description, control, className }: SettingsRowProps) {
  return (
    <div className={cn("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6", className)}>
      <div className="min-w-0 space-y-0.5">
        <div className="font-medium text-sm">{label}</div>
        {description && <div className="text-muted-foreground text-sm">{description}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export interface SettingsSaveBarProps {
  dirty: boolean;
  pending?: boolean;
  onSave: () => void;
  onCancel?: () => void;
  /** Label for the cancel button; required when onCancel is passed. */
  cancelLabel?: string;
  /** Replaces the generic "unsaved changes" text (e.g. "2 cambios sin guardar · Coordinador"). */
  message?: string;
}

export function SettingsSaveBar({ dirty, pending = false, onSave, onCancel, cancelLabel, message }: SettingsSaveBarProps) {
  const t = useTranslations("shared.kit.settings");
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-3 border-t bg-background px-4 py-3 md:-mx-6 md:px-6">
      {dirty && (
        <p role="status" className="mr-auto text-muted-foreground text-sm">
          {message ?? t("unsaved")}
        </p>
      )}
      {onCancel && dirty && (
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {cancelLabel ?? t("cancel")}
        </Button>
      )}
      <Button type="button" onClick={onSave} disabled={!dirty || pending}>
        {t("save")}
      </Button>
    </div>
  );
}
