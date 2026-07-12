"use client";

import { usePanelPath } from "@/lib/v2/panel-path-context";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CamporeePaymentsPanel } from "@/components/camporees/camporee-payments-panel";
import { getCamporeePayments } from "@/lib/api/camporees";
import type { CamporeePayment } from "@/lib/api/camporees";

export interface CamporeePaymentsTabProps {
  camporeeId: number;
  initialPayments: CamporeePayment[];
  isUnionCamporee?: boolean;
  onAfterChange?: () => void;
}

export function CamporeePaymentsTab({
  camporeeId,
  initialPayments,
  isUnionCamporee = false,
  onAfterChange,
}: CamporeePaymentsTabProps) {
  const { toPanelPath } = usePanelPath();

  const [payments, setPayments] = useState<CamporeePayment[]>(initialPayments);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      onAfterChange?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la lista de pagos";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [camporeeId, onAfterChange]);

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
          <Button size="sm" asChild>
            <Link href={`${toPanelPath(`/dashboard/camporees/`)}${camporeeId}/payments/new`}>
              <PlusCircle className="size-4" />
              Registrar pago
            </Link>
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
        camporeeId={camporeeId}
        payments={payments}
        onPaymentsChange={refreshPayments}
        isUnionCamporee={isUnionCamporee}
      />
    </div>
  );
}
