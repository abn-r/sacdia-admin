"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { ApiError } from "@/lib/api/client";
import { patchOrderLine } from "@/lib/api/materials";
import { useToastError } from "@/lib/feedback/toast-retry";
import type { MaterialDisponibilidad } from "@/lib/types/materials";

type Choice = "disponible" | "parcial" | "agotado";
const CHOICES: Choice[] = ["disponible", "parcial", "agotado"];

interface LineAvailabilityCellProps {
  folio: string;
  lineId: string;
  productTitle: string;
  currentDisponibilidad: MaterialDisponibilidad;
  currentQtyDisponible: number | null;
  qty: number;
  /** When false the cell is read-only (order no longer in review). */
  editable: boolean;
}

/**
 * Availability of one order line, resolved in its own row: three choices and,
 * for "Parcial", the quantity. Disponible and Agotado save on click.
 */
export function LineAvailabilityCell({
  folio,
  lineId,
  productTitle,
  currentDisponibilidad,
  currentQtyDisponible,
  qty,
  editable,
}: LineAvailabilityCellProps) {
  const t = useTranslations("ops.materials.availability");
  const router = useRouter();
  const showError = useToastError();
  const qtyId = useId();
  const [isPending, startTransition] = useTransition();
  const [partialOpen, setPartialOpen] = useState(currentDisponibilidad === "parcial");
  const [qtyDraft, setQtyDraft] = useState(String(currentQtyDisponible ?? qty));
  const [qtyError, setQtyError] = useState<string | null>(null);

  const partialLabel =
    currentQtyDisponible != null
      ? t("partial", { available: currentQtyDisponible, qty })
      : t("parcial");

  if (!editable) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {currentDisponibilidad === "disponible" ? (
          <span className="text-muted-foreground">{t("disponible")}</span>
        ) : (
          <ExceptionStatus
            value={currentDisponibilidad}
            normal={["disponible"]}
            labels={{
              pendiente: t("pendiente"),
              disponible: t("disponible"),
              parcial: partialLabel,
              agotado: t("agotado"),
            }}
            intents={{ pendiente: "neutral", parcial: "warning", agotado: "destructive" }}
          />
        )}
      </div>
    );
  }

  function persist(disponibilidad: Choice, qtyDisponible: number) {
    startTransition(async () => {
      try {
        await patchOrderLine(folio, lineId, { disponibilidad, qty_disponible: qtyDisponible });
        toast.success(t("saved"));
        startTransition(() => router.refresh());
      } catch (err) {
        showError({
          title: t("saveError"),
          ...(err instanceof ApiError && err.message ? { description: err.message } : {}),
          onRetry: () => persist(disponibilidad, qtyDisponible),
        });
      }
    });
  }

  function choose(choice: Choice) {
    if (choice === "parcial") {
      setPartialOpen(true);
      return;
    }
    setPartialOpen(false);
    setQtyError(null);
    persist(choice, choice === "disponible" ? qty : 0);
  }

  function savePartial() {
    const parsed = Number.parseInt(qtyDraft, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > qty) {
      setQtyError(t("qtyInvalid", { max: qty }));
      return;
    }
    setQtyError(null);
    persist("parcial", parsed);
  }

  const selected: Choice | null = partialOpen
    ? "parcial"
    : currentDisponibilidad === "pendiente"
      ? null
      : currentDisponibilidad;

  return (
    <div className="space-y-2">
      <div role="group" aria-label={t("group", { product: productTitle })} className="flex flex-wrap gap-1.5">
        {CHOICES.map((choice) => (
          <Button
            key={choice}
            type="button"
            size="xs"
            variant={selected === choice ? "secondary" : "outline"}
            aria-pressed={selected === choice}
            disabled={isPending}
            onClick={() => choose(choice)}
          >
            {t(choice)}
          </Button>
        ))}
      </div>
      {partialOpen ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor={qtyId} className="text-xs text-muted-foreground">
              {t("qtyLabel", { max: qty })}
            </Label>
            <Input
              id={qtyId}
              type="number"
              inputMode="numeric"
              min={1}
              max={qty}
              className="h-8 w-24 tabular-nums"
              value={qtyDraft}
              aria-invalid={qtyError ? true : undefined}
              onChange={(e) => setQtyDraft(e.target.value)}
              disabled={isPending}
            />
          </div>
          <Button type="button" size="xs" loading={isPending} onClick={savePartial}>
            {t("save")}
          </Button>
          {qtyError ? (
            <p role="alert" className="basis-full text-xs text-destructive">
              {qtyError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
