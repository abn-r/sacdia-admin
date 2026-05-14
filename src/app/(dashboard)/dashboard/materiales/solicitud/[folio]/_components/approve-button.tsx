"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aprobarOrden } from "@/lib/api/materiales";
import { ApiError } from "@/lib/api/client";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ApproveButtonProps {
  folio: string;
  allLinesResolved: boolean;
  canApprove: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApproveButton({
  folio,
  allLinesResolved,
  canApprove,
}: ApproveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isDisabled = !allLinesResolved || !canApprove || isPending;

  async function handleApprove() {
    try {
      await aprobarOrden(folio);
      toast.success("Solicitud aprobada correctamente.");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      if (err instanceof ApiError) {
        // Surface 409 insufficient_stock details if present
        const details = (err as ApiError & { details?: unknown }).details;
        if (err.status === 409 && details) {
          const affected = Array.isArray(details)
            ? details
                .map(
                  (d: { product_id?: string; required?: number; available?: number }) =>
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

  return (
    <Button
      variant="default"
      size="sm"
      disabled={isDisabled}
      onClick={handleApprove}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-1.5 size-4 animate-spin" />
          Aprobando...
        </>
      ) : (
        <>
          <CheckCircle className="mr-1.5 size-4" />
          Aprobar solicitud
        </>
      )}
    </Button>
  );
}
