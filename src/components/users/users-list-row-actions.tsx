"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, Send, UserX } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/shared/row-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import { resendAdminUserInvitationFromClient } from "@/lib/api/admin-users";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { useToastError } from "@/lib/feedback/toast-retry";
import { deactivateAdminUserFromClient } from "@/lib/users/list-actions";
import { resendInvitationFailure, resolveUserRowActions } from "@/lib/users/list-row-actions";

export interface UsersListRowActionsProps {
  userId: string;
  /** Display name, for the menu label and the confirmation. */
  name: string;
  active: boolean;
  isDeleted: boolean;
  postRegistrationComplete: boolean | null;
}

/** "⋯" menu of a users-list row: only what the API supports and the actor may do. */
export function UsersListRowActions({
  userId,
  name,
  active,
  isDeleted,
  postRegistrationComplete,
}: UsersListRowActionsProps) {
  const t = useTranslations("people.users.list.rowActions");
  const router = useRouter();
  const toastError = useToastError();
  const { canCapability } = useScreenAccess();
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);

  const flags = resolveUserRowActions(
    { active, isDeleted, postRegistrationComplete },
    {
      canViewDetail: canCapability("users", "view_detail"),
      canCreate: canCapability("users", "create"),
      canUpdateAdmin: canCapability("users", "update_admin"),
    },
  );

  async function resend() {
    try {
      await resendAdminUserInvitationFromClient(userId);
      toast.success(t("resendSuccess", { name }));
    } catch (error) {
      const failure = resendInvitationFailure(error instanceof ApiError ? error.status : null);
      toastError({
        title: t(`resendFailure.${failure}`),
        ...(failure === "generic" || failure === "unavailable" ? { onRetry: () => void resend() } : {}),
      });
    }
  }

  async function deactivate() {
    try {
      await deactivateAdminUserFromClient(userId);
    } catch {
      // The dialog stays open and shows this inline.
      throw new Error(t("deactivateFailed", { name }));
    }
    toast.success(t("deactivateSuccess", { name }));
    router.refresh();
  }

  return (
    <>
      <RowActions
        label={name}
        actions={[
          {
            label: t("view"),
            icon: Eye,
            href: `/dashboard/users/${userId}`,
            hidden: !flags.view,
          },
          {
            label: t("resend"),
            icon: Send,
            hidden: !flags.resendInvitation,
            onSelect: () => void resend(),
          },
          {
            label: t("deactivate"),
            icon: UserX,
            destructive: true,
            hidden: !flags.deactivate,
            onSelect: () => setConfirmingDeactivate(true),
          },
        ]}
      />
      {flags.deactivate ? (
        <ConfirmDialog
          open={confirmingDeactivate}
          onOpenChange={setConfirmingDeactivate}
          tone="destructive"
          title={t("deactivateTitle", { name })}
          description={t("deactivateDescription")}
          confirmLabel={t("deactivateConfirm")}
          onConfirm={deactivate}
        />
      ) : null}
    </>
  );
}
