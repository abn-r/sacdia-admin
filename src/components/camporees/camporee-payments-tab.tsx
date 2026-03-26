"use client";

import { useState, useCallback } from "react";
import { PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CamporeePaymentsPanel } from "@/components/camporees/camporee-payments-panel";
import { PaymentDialog } from "@/components/camporees/payment-dialog";
import { getCamporeePayments } from "@/lib/api/camporees";
import type { CamporeePayment, CamporeeMember } from "@/lib/api/camporees";

interface CamporeePaymentsTabProps {
  camporeeId: number;
  initialPayments: CamporeePayment[];
  members: CamporeeMember[];
}

export function CamporeePaymentsTab({
  camporeeId,
  initialPayments,
  members,
}: CamporeePaymentsTabProps) {
  const [payments, setPayments] = useState<CamporeePayment[]>(initialPayments);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<CamporeePayment | null>(null);

  const refreshPayments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const payload = await getCamporeePayments(camporeeId);
      const raw = payload as unknown;
      let list: CamporeePayment[] = [];
      if (Array.isArray(raw)) {
        list = raw as CamporeePayment[];
      } else if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        if (Array.isArray(r.data)) {
          list = r.data as CamporeePayment[];
        }
      }
      setPayments(list);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la lista de pagos";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [camporeeId]);

  function handleNewPayment() {
    setEditingPayment(null);
    setDialogOpen(true);
  }

  function handleEditPayment(payment: CamporeePayment) {
    setEditingPayment(payment);
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      setEditingPayment(null);
    }
    setDialogOpen(open);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{payments.length}</span>{" "}
          {payments.length === 1 ? "pago registrado" : "pagos registrados"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refreshPayments}
            disabled={isLoading}
            title="Actualizar lista"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">Actualizar</span>
          </Button>
          <Button size="sm" onClick={handleNewPayment}>
            <PlusCircle className="mr-2 size-4" />
            Registrar pago
          </Button>
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <CamporeePaymentsPanel
        payments={payments}
        onEdit={handleEditPayment}
        onPaymentsChange={refreshPayments}
      />

      <PaymentDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        camporeeId={camporeeId}
        members={members}
        payment={editingPayment}
        onSuccess={refreshPayments}
      />
    </div>
  );
}
