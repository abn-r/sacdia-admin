"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";
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

  async function handleApprove() {
    try {
      await approveOrder(folio);
      toast.success("Solicitud aprobada correctamente.");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      if (err instanceof ApiError) {
        const details = (err as ApiError & { details?: unknown }).details;
        if (err.status === 409 && details) {
          const affected = Array.isArray(details)
            ? details
                .map(
                  (d: {
                    product_id?: string;
                    required?: number;
                    available?: number;
                  }) =>
                    `Producto ${d.product_id}: requiere ${d.required}, disponible ${d.available}`,
                )
                .join("; ")
            : String(details);
          toast.error(`Stock insuficiente: ${affected}`);
        } else {
          toast.error(err.message || "Error al aprobar la solicitud.");
        }
      } else {
        toast.error("Error al aprobar la solicitud.");
      }
    }
  }

  const isDisabled = disabled || isPending;
  const button = (
    <Button
      variant="default"
      size="sm"
      disabled={isDisabled}
      onClick={handleApprove}
      className={fullWidth ? "w-full" : undefined}
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
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
