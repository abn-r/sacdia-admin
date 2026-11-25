"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteCamporee, deleteUnionCamporee } from "@/lib/api/camporees";
import type { CamporeeKind } from "@/lib/camporees/normalize";

export interface CamporeeDeleteConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: CamporeeKind;
  camporee: { id: number; name: string } | null;
  /** Where to go after deleting (the detail goes back to the list). */
  redirectTo?: string;
}

/** One delete confirmation for local and union camporees, from the list and the detail. */
export function CamporeeDeleteConfirm({
  open,
  onOpenChange,
  kind,
  camporee,
  redirectTo,
}: CamporeeDeleteConfirmProps) {
  const t = useTranslations("evaluation.camporees.delete");
  const tt = useTranslations("camporees");
  const router = useRouter();

  async function handleConfirm() {
    if (!camporee || !camporee.id) return;
    try {
      if (kind === "union") await deleteUnionCamporee(camporee.id);
      else await deleteCamporee(camporee.id);
    } catch (error: unknown) {
      throw new Error(
        error instanceof Error && error.message.trim()
          ? error.message
          : tt("errors.delete_camporee"),
      );
    }
    toast.success(
      kind === "union" ? tt("toasts.union_camporee_deleted") : tt("toasts.camporee_deleted"),
    );
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="destructive"
      title={t("title", { name: camporee?.name ?? "" })}
      description={t("description")}
      confirmLabel={t("confirm")}
      onConfirm={handleConfirm}
    />
  );
}
