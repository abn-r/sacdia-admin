"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { patchOrdenLinea } from "@/lib/api/materiales";
import type { MaterialDisponibilidad } from "@/lib/types/materiales";
import type { PatchOrdenLineaPayload } from "@/lib/api/materiales";
import { ApiError } from "@/lib/api/client";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LineAvailabilityFormProps {
  folio: string;
  lineId: string;
  currentDisponibilidad: MaterialDisponibilidad;
  currentQtyDisponible: number | null;
  qty: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LineAvailabilityForm({
  folio,
  lineId,
  currentDisponibilidad,
  currentQtyDisponible,
  qty,
}: LineAvailabilityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [disponibilidad, setDisponibilidad] =
    useState<MaterialDisponibilidad>(currentDisponibilidad);
  const [qtyDisponible, setQtyDisponible] = useState<string>(
    currentQtyDisponible != null ? String(currentQtyDisponible) : "",
  );

  async function submitPatch(
    newDisponibilidad: PatchOrdenLineaPayload["disponibilidad"],
    newQtyDisponible?: number,
  ) {
    try {
      await patchOrdenLinea(folio, lineId, {
        disponibilidad: newDisponibilidad,
        qty_disponible: newQtyDisponible,
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Error al actualizar disponibilidad.";
      toast.error(message);
    }
  }

  function handleDisponibilidadChange(value: string) {
    const disp = value as MaterialDisponibilidad;
    setDisponibilidad(disp);

    if (disp === "disponible") {
      submitPatch("disponible", qty);
    } else if (disp === "agotado") {
      submitPatch("agotado", 0);
    }
    // "pendiente" or "parcial" — "parcial" waits for qty input blur
  }

  function handleQtyBlur() {
    if (disponibilidad !== "parcial") return;
    const parsed = parseInt(qtyDisponible, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > qty) {
      toast.error(
        `Cantidad disponible debe ser entre 1 y ${qty}.`,
      );
      return;
    }
    submitPatch("parcial", parsed);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={disponibilidad}
        onValueChange={handleDisponibilidadChange}
        disabled={isPending}
      >
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Disponibilidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pendiente">Pendiente</SelectItem>
          <SelectItem value="disponible">Disponible</SelectItem>
          <SelectItem value="parcial">Parcial</SelectItem>
          <SelectItem value="agotado">Agotado</SelectItem>
        </SelectContent>
      </Select>

      {disponibilidad === "parcial" && (
        <Input
          type="number"
          min={1}
          max={qty}
          className="h-8 w-[80px] text-xs"
          placeholder={`1–${qty}`}
          value={qtyDisponible}
          onChange={(e) => setQtyDisponible(e.target.value)}
          onBlur={handleQtyBlur}
          disabled={isPending}
        />
      )}
    </div>
  );
}
