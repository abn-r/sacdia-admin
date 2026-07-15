"use client";

/**
 * VenueCreateDialog — inline Dialog (≤4 flat fields) for creating a venue
 * from within the event form.
 *
 * DS §6.1.1: ≤4 flat fields, no relations/uploads → Dialog OK.
 * Fields: name (required), capacity (optional), description/notes (optional).
 * Scope is auto-derived from the camporee — user never sets union_id / local_field_id.
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCamporeeVenueAction } from "@/lib/camporee-venues/actions";
import type { CamporeeVenue } from "@/lib/api/camporee-venues";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface VenueCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Local camporee ID — used to scope the venue to the correct local_field. */
  camporeeId: number;
  /** When true, scope the venue to the union owning the camporee. */
  isUnionCamporee?: boolean;
  /** Called with the newly created venue on success. */
  onCreated: (venue: CamporeeVenue) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VenueCreateDialog({
  open,
  onOpenChange,
  camporeeId,
  isUnionCamporee = false,
  onCreated,
}: VenueCreateDialogProps) {
  const t = useTranslations("camporeeEvents.venueCreateDialog");
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setCapacity("");
    setDescription("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre de la sede es obligatorio.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createCamporeeVenueAction({
        camporeeId,
        isUnionCamporee,
        name: name.trim(),
        capacity: capacity ? Number(capacity) : undefined,
        description: description.trim() || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.venue) {
        toast.success(`Sede "${result.venue.name}" creada correctamente.`);
        onCreated(result.venue);
        reset();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear nueva sede</DialogTitle>
          <DialogDescription>
            {isUnionCamporee
              ? "La sede se asociará automáticamente a la unión del camporee."
              : "La sede se asociará automáticamente al campo local del camporee."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="venue-name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="venue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Anfiteatro Central"
              maxLength={150}
              required
              autoFocus
            />
          </div>

          {/* Capacity */}
          <div className="space-y-1.5">
            <Label htmlFor="venue-capacity">
              Capacidad <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="venue-capacity"
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder={t("capacityPlaceholder")}
            />
          </div>

          {/* Description / notes */}
          <div className="space-y-1.5">
            <Label htmlFor="venue-description">
              Notas <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="venue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={t("notesPlaceholder")}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Crear sede
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
