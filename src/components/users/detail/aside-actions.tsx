"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { patchUserAccessFlag } from "@/lib/users/detail-access";
import { ResendInvitationButton } from "./resend-invitation-button";

interface UserDetailAsideActionsProps {
  userId: string;
  fullName: string;
  active: boolean;
  /** `users:update_admin`: same gate as the Accesos switches. */
  canManageAccess: boolean;
  /** Pending invitation AND `users:create`. */
  canResendInvitation: boolean;
  /** Link to the Roles y accesos tab. */
  accessHref: string;
}

export function UserDetailAsideActions({
  userId,
  fullName,
  active,
  canManageAccess,
  canResendInvitation,
  accessHref,
}: UserDetailAsideActionsProps) {
  const t = useTranslations("people.userDetail");
  const tToasts = useTranslations("users.toasts");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const next = !active;
  const copy = active ? "deactivate" : "reactivate";

  async function apply() {
    setPending(true);
    try {
      await patchUserAccessFlag(userId, { active: next });
      toast.success(tToasts("access_updated"));
      router.refresh();
    } catch {
      throw new Error(tToasts("access_update_failed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {canResendInvitation ? <ResendInvitationButton userId={userId} className="w-full" /> : null}
      <Button asChild size="sm" variant="outline" className="w-full">
        <Link href={accessHref}>
          <Shield className="size-4" />
          {t("actions.assignRole")}
        </Link>
      </Button>
      {canManageAccess ? (
        <Button
          type="button"
          size="sm"
          variant={active ? "destructive" : "outline"}
          className="w-full"
          onClick={() => setOpen(true)}
        >
          {t(`actions.${copy}`)}
        </Button>
      ) : null}

      {canManageAccess ? (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={t(`${copy}.title`, { name: fullName })}
          description={t(`${copy}.description`)}
          confirmLabel={t(`${copy}.confirm`)}
          tone={active ? "destructive" : "default"}
          pending={pending}
          onConfirm={apply}
        />
      ) : null}
    </div>
  );
}
