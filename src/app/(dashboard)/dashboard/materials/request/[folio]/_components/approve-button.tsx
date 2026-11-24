"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveOrder } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import { useToastError } from "@/lib/feedback/toast-retry";

interface ApproveButtonProps {
  folio: string;
  /** Rendered disabled while lines are still pending. */
  disabled?: boolean;
  fullWidth?: boolean;
}

export function ApproveButton({ folio, disabled = false, fullWidth = false }: ApproveButtonProps) {
  const t = useTranslations("ops.materials.actions");
  const router = useRouter();
  const showError = useToastError();
  const [isPending, startTransition] = useTransition();

  // The whole action runs inside the transition: the button stays disabled
  // from the click until the refreshed page arrives, so a second click cannot
  // re-post an order that is already approved (409).
  function run() {
    startTransition(async () => {
      try {
        await approveOrder(folio);
        toast.success(t("approved"));
        startTransition(() => {
          router.refresh();
        });
      } catch (err) {
        // The stock-shortage detail never reaches the client in production
        // (the backend filter strips it), so show the backend message.
        showError({
          title: t("approveError"),
          ...(err instanceof ApiError && err.message ? { description: err.message } : {}),
          onRetry: run,
        });
      }
    });
  }

  return (
    <Button
      loading={isPending}
      variant="default"
      size="sm"
      disabled={disabled || isPending}
      onClick={run}
      className={fullWidth ? "w-full" : undefined}
    >
      <CheckCircle className="size-4" />
      {t("approve")}
    </Button>
  );
}
