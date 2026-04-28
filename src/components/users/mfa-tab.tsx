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
  if (enabled) {
    return (
      <Badge variant="success" className="gap-1">
        <ShieldCheck size={12} />
        Habilitado
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1">
      <ShieldOff size={12} />
      No configurado
    </Badge>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function MfaNotConfigured() {
  return (
    <Card>
      <CardContent className="py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <Shield size={18} className="text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">MFA no configurado</p>
            <p className="text-[13px] text-muted-foreground">
              Este usuario no ha configurado la autenticacion de dos factores.
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
          description: "El usuario debera re-enrolarse en su proximo inicio de sesion.",
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
          Resetear MFA
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-warning-foreground" />
            Resetear autenticacion de dos factores
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Esta accion elimina el secreto TOTP y todos los codigos de respaldo del usuario.
            </span>
            <span className="block font-medium text-foreground">
              El usuario debera configurar MFA nuevamente desde su cuenta. Si el usuario
              perdio acceso a su app autenticadora, esta accion le permite recuperar el acceso.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
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
                Reseteando...
              </>
            ) : (
              "Confirmar reset"
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
          description: "La autenticacion de dos factores fue removida del usuario.",
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
          Deshabilitar MFA
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldOff size={18} className="text-destructive" />
            Deshabilitar autenticacion de dos factores
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Esta es una accion de soporte para casos donde el usuario no puede acceder
              a su cuenta. Se eliminara permanentemente el secreto TOTP y los codigos de respaldo.
            </span>
            <span className="block font-medium text-destructive">
              La cuenta del usuario quedara protegida unicamente con contrasena.
              Usar solo cuando el usuario haya solicitado este soporte.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
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
                Deshabilitando...
              </>
            ) : (
              "Confirmar, deshabilitar MFA"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MfaTab({ userId, mfaEnabled, canManageMfa }: MfaTabProps) {
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
            Autenticacion de dos factores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Estado</p>
              <p className="text-[13px] text-muted-foreground">
                El usuario tiene MFA activo en su cuenta.
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
              <p className="text-sm font-medium">Metodo</p>
              <p className="text-[13px] text-muted-foreground">
                TOTP — App autenticadora (Google Authenticator, Authy, etc.)
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
              Acciones de administrador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[13px] text-muted-foreground">
              Estas acciones son irreversibles y estan destinadas a casos de soporte donde
              el usuario perdio acceso a su app autenticadora. Cada accion elimina el secreto
              TOTP y los codigos de respaldo almacenados.
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
