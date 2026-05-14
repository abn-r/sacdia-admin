"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { entregarOrden } from "@/lib/api/materiales";
import { ApiError } from "@/lib/api/client";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DeliverButtonProps {
  folio: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeliverButton({ folio }: DeliverButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleDeliver() {
    try {
      await entregarOrden(folio);
      toast.success("Solicitud marcada como entregada.");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Error al registrar entrega.";
      toast.error(message);
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleDeliver}>
      {isPending ? (
        <>
          <Loader2 className="mr-1.5 size-4 animate-spin" />
          Registrando...
        </>
      ) : (
        <>
          <Truck className="mr-1.5 size-4" />
          Marcar como entregada
        </>
      )}
    </Button>
  );
}
