"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { approveOrder } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ApproveButtonProps {
  folio: string;
  /** When true the button is rendered disabled (e.g. lines pending). */
  disabled?: boolean;
  /** Tooltip text to surface when disabled. */
  disabledReason?: string;
  /** Stretch to full width — useful in the right rail. */
  fullWidth?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApproveButton({
  folio,
  disabled = false,
  disabledReason,
  fullWidth = false,
}: ApproveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // The whole action runs inside the transition: the button stays disabled
  // from the click until the refreshed page arrives, so a second click cannot
  // re-post an order that is already approved (409).
  function handleApprove() {
    startTransition(async () => {
      try {
        await approveOrder(folio);
        toast.success("Solicitud aprobada correctamente.");
        startTransition(() => {
          router.refresh();
        });
      } catch (err) {
        // The stock-shortage detail never reaches the client in production
        // (the backend filter strips it), so show the backend message.
        toast.error(
          err instanceof ApiError && err.message
            ? err.message
            : "Error al aprobar la solicitud.",
        );
      }
    });
  }

  const isDisabled = disabled || isPending;
  const button = (
    <Button
      loading={isPending}
      variant="default"
      size="sm"
      disabled={isDisabled}
      onClick={handleApprove}
      className={fullWidth ? "w-full" : undefined}
    >
      {isPending ? (
        <>
          Aprobando…
        </>
      ) : (
        <>
          <CheckCircle className="size-4" />
          Aprobar pedido
        </>
      )}
    </Button>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={fullWidth ? "block w-full" : "inline-block"}>
            {button}
          </span>
        </TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
