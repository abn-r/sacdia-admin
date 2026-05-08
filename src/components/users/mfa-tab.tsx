"use client";

import { useState, useTransition } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  Smartphone,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { adminResetUserMfa } from "@/lib/api/mfa";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MfaTabProps = {
  userId: string;
  mfaEnabled: boolean | null;
  canManageMfa: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MfaStatusBadge({ enabled }: { enabled: boolean }) {
  const t = useTranslations("users");
  if (enabled) {
    return (
      <Badge variant="success" className="gap-1">
        <ShieldCheck size={12} />
        {t("mfa.status_enabled")}
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1">
      <ShieldOff size={12} />
      {t("mfa.status_not_configured")}
    </Badge>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function MfaNotConfigured() {
  const t = useTranslations("users");
  return (
    <Card>
      <CardContent className="py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <Shield size={18} className="text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("mfa.not_configured_title")}</p>
            <p className="text-[13px] text-muted-foreground">
              {t("mfa.not_configured_description")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Reset dialog ─────────────────────────────────────────────────────────────

function ResetMfaDialog({
  userId,
  onSuccess,
}: {
  userId: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("users");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await adminResetUserMfa(userId);
        toast.success(t("toasts.mfa_reset"), {
          description: t("mfa.reset_toast_description"),
        });
        onSuccess();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("errors.mfa_reset_description");
        toast.error(t("toasts.mfa_reset_failed"), { description: message });
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw size={14} />
          {t("mfa.reset_button")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-warning-foreground" />
            {t("mfa.reset_dialog_title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              {t("mfa.reset_dialog_body1")}
            </span>
            <span className="block font-medium text-foreground">
              {t("mfa.reset_dialog_body2")}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t("mfa.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("mfa.reset_confirming")}
              </>
            ) : (
              t("mfa.reset_confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Disable dialog ───────────────────────────────────────────────────────────

function DisableMfaDialog({
  userId,
  onSuccess,
}: {
  userId: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("users");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await adminResetUserMfa(userId);
        toast.success(t("toasts.mfa_disabled"), {
          description: t("mfa.disable_toast_description"),
        });
        onSuccess();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("errors.mfa_disable_description");
        toast.error(t("toasts.mfa_disable_failed"), { description: message });
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <ShieldOff size={14} />
          {t("mfa.disable_button")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldOff size={18} className="text-destructive" />
            {t("mfa.disable_dialog_title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              {t("mfa.disable_dialog_body1")}
            </span>
            <span className="block font-medium text-destructive">
              {t("mfa.disable_dialog_body2")}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t("mfa.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("mfa.disable_confirming")}
              </>
            ) : (
              t("mfa.disable_confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MfaTab({ userId, mfaEnabled, canManageMfa }: MfaTabProps) {
  const t = useTranslations("users");
  const [enabled, setEnabled] = useState(mfaEnabled);

  // MFA not configured for this user
  if (!enabled) {
    return (
      <div className="space-y-4">
        <MfaNotConfigured />
      </div>
    );
  }

  // MFA is active — show status card + admin actions
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck size={16} className="text-success" />
            {t("mfa.card_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t("mfa.status_label")}</p>
              <p className="text-[13px] text-muted-foreground">
                {t("mfa.status_description")}
              </p>
            </div>
            <MfaStatusBadge enabled={true} />
          </div>

          <Separator />

          {/* Method row */}
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <Smartphone size={14} className="text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t("mfa.method_label")}</p>
              <p className="text-[13px] text-muted-foreground">
                {t("mfa.method_description")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin actions — only shown to users with mfa management permission */}
      {canManageMfa ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              {t("mfa.admin_actions_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[13px] text-muted-foreground">
              {t("mfa.admin_actions_description")}
            </p>

            <div className="flex flex-wrap gap-3">
              <ResetMfaDialog
                userId={userId}
                onSuccess={() => setEnabled(false)}
              />
              <DisableMfaDialog
                userId={userId}
                onSuccess={() => setEnabled(false)}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
