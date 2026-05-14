"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deliverOrder } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DeliverButtonProps {
  folio: string;
  fullWidth?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeliverButton({ folio, fullWidth = false }: DeliverButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleDeliver() {
    try {
      await deliverOrder(folio);
      toast.success("Solicitud marcada como entregada.");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Error al registrar entrega.";
      toast.error(message);
    }
  }

  return (
    <Button
      variant="default"
      size="sm"
      disabled={isPending}
      onClick={handleDeliver}
      className={fullWidth ? "w-full" : undefined}
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Registrando…
        </>
      ) : (
        <>
          <Truck className="size-4" />
          Marcar como entregado
        </>
      )}
    </Button>
  );
}
