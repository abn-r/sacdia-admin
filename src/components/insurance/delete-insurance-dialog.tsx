"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";
import { deactivateInsurance } from "@/lib/api/insurance";
import type { MemberInsurance } from "@/lib/api/insurance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function memberFullName(member: MemberInsurance | null): string {
  if (!member) return "";
  const parts = [member.name, member.paternal_last_name, member.maternal_last_name].filter(Boolean);
  return parts.join(" ") || "este miembro";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DeleteInsuranceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberInsurance | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeleteInsuranceDialog({
  open,
  onOpenChange,
  member,
  onSuccess,
}: DeleteInsuranceDialogProps) {
  const t = useTranslations("insurance");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    const insuranceId = member?.insurance?.insurance_id;
    if (!insuranceId) return;

    setIsDeleting(true);
    try {
      await deactivateInsurance(insuranceId);
      toast.success(t("toasts.deactivated"));
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.deactivate_failed");
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desactivar seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás por desactivar el seguro de{" "}
            <span className="font-medium text-foreground">
              {memberFullName(member)}
            </span>
            . El registro se conservará en el historial pero dejará de estar
            vigente. ¿Deseas continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? "Desactivando..." : "Desactivar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
