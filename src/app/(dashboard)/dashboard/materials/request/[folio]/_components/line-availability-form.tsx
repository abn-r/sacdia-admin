"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { patchOrderLine } from "@/lib/api/materials";
import type { MaterialDisponibilidad } from "@/lib/types/materials";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

// ─── Badge config per disponibilidad ──────────────────────────────────────────

const BADGE_CONFIG: Record<
  MaterialDisponibilidad,
  {
    label: string;
    variant: "outline" | "success" | "warning" | "destructive";
  }
> = {
  pendiente: { label: "Pendiente", variant: "outline" },
  disponible: { label: "Disponible", variant: "success" },
  parcial: { label: "Parcial", variant: "warning" },
  agotado: { label: "Agotado", variant: "destructive" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface LineAvailabilityFormProps {
  folio: string;
  lineId: string;
  currentDisponibilidad: MaterialDisponibilidad;
  currentQtyDisponible: number | null;
  qty: number;
  /** When false, badge becomes a read-only display (no popover). */
  editable: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LineAvailabilityCell({
  folio,
  lineId,
  currentDisponibilidad,
  currentQtyDisponible,
  qty,
  editable,
}: LineAvailabilityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Local form state, hydrated from props every time popover opens
  const initialDraft: MaterialDisponibilidad =
    currentDisponibilidad === "pendiente" ? "disponible" : currentDisponibilidad;
  const [draft, setDraft] = useState<MaterialDisponibilidad>(initialDraft);
  const [qtyDraft, setQtyDraft] = useState<string>(
    currentQtyDisponible != null ? String(currentQtyDisponible) : String(qty),
  );

  function handleOpenChange(next: boolean) {
    if (next) {
      // Hydrate draft state from current props when opening the popover.
      setDraft(initialDraft);
      setQtyDraft(
        currentQtyDisponible != null ? String(currentQtyDisponible) : String(qty),
      );
    }
    setOpen(next);
  }

  const config = BADGE_CONFIG[currentDisponibilidad];

  // Read-only mode (estado !== en_revision)
  if (!editable) {
    return (
      <Badge variant={config.variant}>
        {config.label}
        {currentDisponibilidad === "parcial" &&
          currentQtyDisponible != null && (
            <span className="ml-1 font-mono tabular-nums">
              ({currentQtyDisponible}/{qty})
            </span>
          )}
      </Badge>
    );
  }

  async function submit() {
    if (draft === "parcial") {
      const parsed = parseInt(qtyDraft, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > qty) {
        toast.error(`Cantidad disponible debe estar entre 1 y ${qty}.`);
        return;
      }
      await persist("parcial", parsed);
    } else if (draft === "disponible") {
      await persist("disponible", qty);
    } else {
      await persist("agotado", 0);
    }
  }

  async function persist(
    disponibilidad: "disponible" | "parcial" | "agotado",
    qty_disponible: number,
  ) {
    try {
      await patchOrderLine(folio, lineId, {
        disponibilidad,
        qty_disponible,
      });
      toast.success("Disponibilidad actualizada.");
      setOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Error al actualizar la disponibilidad.";
      toast.error(message);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "group inline-flex items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
            )}
            aria-label={`Cambiar disponibilidad (actual: ${config.label})`}
          >
            <Badge
              variant={config.variant}
              className="gap-1 cursor-pointer hover:opacity-90"
            >
              {config.label}
              <ChevronDown className="size-3 opacity-70" />
            </Badge>
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-64">
          <div className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor={`disp-${lineId}`}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Disponibilidad
              </label>
              <Select
                value={draft}
                onValueChange={(v) =>
                  setDraft(v as MaterialDisponibilidad)
                }
                disabled={isPending}
              >
                <SelectTrigger id={`disp-${lineId}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="agotado">Agotado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {draft === "parcial" && (
              <div className="space-y-1">
                <label
                  htmlFor={`qty-${lineId}`}
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Cantidad disponible (1–{qty})
                </label>
                <Input
                  id={`qty-${lineId}`}
                  type="number"
                  min={1}
                  max={qty}
                  className="font-mono tabular-nums"
                  value={qtyDraft}
                  onChange={(e) => setQtyDraft(e.target.value)}
                  disabled={isPending}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={submit}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {currentDisponibilidad === "parcial" && currentQtyDisponible != null && (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {currentQtyDisponible}/{qty}
        </span>
      )}
    </div>
  );
}

// Backwards-compatible default export name kept for callers that may import
// `LineAvailabilityForm`. New callers should use `LineAvailabilityCell`.
export const LineAvailabilityForm = LineAvailabilityCell;
