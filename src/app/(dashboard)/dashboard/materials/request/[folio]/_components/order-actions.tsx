"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { MoneyFormat } from "@/components/materials/money-format";
import { cancelOrder, deliverOrder } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import { useToastError } from "@/lib/feedback/toast-retry";
import { cancelConsequence } from "@/lib/materials/order-state";
import type { MaterialEstado } from "@/lib/types/materials";
import { ApproveButton } from "./approve-button";

interface OrderActionsProps {
  /** Order UUID (the API accepts it as folio). */
  orderId: string;
  folio: string;
  estado: MaterialEstado;
  totalCentavos: number;
  directorName: string;
  pieces: number;
  canApprove: boolean;
  canDeliver: boolean;
  /** Every line already has availability. */
  allResolved: boolean;
}

const CANCEL_MIN_REASON = 10;

/**
 * The action buttons of the order detail. Approve waits for every line; deliver
 * asks before closing the order; cancel says what it will do in the current
 * state (restore stock or leave a refund) before it asks for the reason.
 */
export function OrderActions({
  orderId,
  folio,
  estado,
  totalCentavos,
  directorName,
  pieces,
  canApprove,
  canDeliver,
  allResolved,
}: OrderActionsProps) {
  const t = useTranslations("ops.materials");
  const tInbox = useTranslations("materials.pages.inbox.statusOptions");
  const router = useRouter();
  const showError = useToastError();
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const consequence = cancelConsequence(estado);
  const showApprove = estado === "en_revision" && canApprove;
  const showDeliver = estado === "pagada" && canDeliver;
  const showCancel = consequence !== null && canApprove;

  async function confirmDeliver() {
    try {
      await deliverOrder(orderId);
    } catch (err) {
      throw new Error(err instanceof ApiError && err.message ? err.message : t("deliver.error"));
    }
    toast.success(t("deliver.done"));
    router.refresh();
  }

  async function confirmCancel(reason: string) {
    setCancelling(true);
    try {
      await cancelOrder(orderId, reason);
      toast.success(t("cancel.done"));
      setCancelOpen(false);
      router.refresh();
    } catch (err) {
      showError({
        title: t("cancel.error"),
        ...(err instanceof ApiError && err.message ? { description: err.message } : {}),
      });
    } finally {
      setCancelling(false);
    }
  }

  if (!showApprove && !showDeliver && !showCancel) return null;

  return (
    <div className="flex flex-col gap-2">
      {showApprove ? <ApproveButton folio={orderId} disabled={!allResolved} fullWidth /> : null}
      {showDeliver ? (
        <Button size="sm" className="w-full" onClick={() => setDeliverOpen(true)}>
          <Truck className="size-4" />
          {t("actions.deliver")}
        </Button>
      ) : null}
      {showCancel ? (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => setCancelOpen(true)}>
          {t("actions.cancel")}
        </Button>
      ) : null}

      <ConfirmDialog
        open={deliverOpen}
        onOpenChange={setDeliverOpen}
        title={t("deliver.title", { folio })}
        description={t("deliver.description", { director: directorName, pieces })}
        confirmLabel={t("deliver.confirm")}
        cancelLabel={t("deliver.back")}
        onConfirm={confirmDeliver}
      />

      {consequence ? (
        <ReasonDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          title={t("cancel.title")}
          description={
            <div className="space-y-3">
              <p>
                {t("cancel.summary", { folio, estado: tInbox(estado) })} ·{" "}
                <MoneyFormat centavos={totalCentavos} />
              </p>
              <p
                data-slot="cancel-consequence"
                className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning-foreground"
              >
                {t(`cancel.consequence.${consequence}`)}
              </p>
            </div>
          }
          label={t("cancel.reasonLabel")}
          placeholder={t("cancel.reasonPlaceholder")}
          min={CANCEL_MIN_REASON}
          confirmLabel={t("cancel.confirm")}
          pending={cancelling}
          onConfirm={confirmCancel}
        />
      ) : null}
    </div>
  );
}
