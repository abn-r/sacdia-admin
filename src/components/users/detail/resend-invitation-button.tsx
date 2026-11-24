"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { resendAdminUserInvitationFromClient } from "@/lib/api/admin-users";
import { useToastError } from "@/lib/feedback/toast-retry";

interface ResendInvitationButtonProps {
  userId: string;
  className?: string;
}

/** Resends the pending invitation; same outcomes as before (409 refreshes, 429 / 503 explain). */
export function ResendInvitationButton({ userId, className }: ResendInvitationButtonProps) {
  const t = useTranslations("users.postRegistration");
  const router = useRouter();
  const toastError = useToastError();
  const [pending, setPending] = useState(false);

  async function resend() {
    setPending(true);
    try {
      await resendAdminUserInvitationFromClient(userId);
      toast.success(t("resend_invitation_success"));
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error(t("resend_invitation_already_accepted"));
        // The invitation is no longer pending: reload so the action goes away.
        router.refresh();
      } else if (error instanceof ApiError && error.status === 429) {
        toast.error(t("resend_invitation_rate_limited"));
      } else if (error instanceof ApiError && error.status === 503) {
        toast.error(t("resend_invitation_unavailable"));
      } else {
        toastError({
          title: t("resend_invitation_failed"),
          onRetry: () => void resend(),
        });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={className}
      loading={pending}
      onClick={() => void resend()}
    >
      <Mail className="size-4" />
      {t("resend_invitation")}
    </Button>
  );
}
