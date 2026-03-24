"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enrollClub } from "@/lib/api/camporees";

// ─── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  club_section_id: z.coerce
    .number()
    .int("Debe ser un número entero")
    .positive("Debe ser mayor a cero"),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface EnrollClubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporeeId: number;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EnrollClubDialog({
  open,
  onOpenChange,
  camporeeId,
  onSuccess,
}: EnrollClubDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      club_section_id: undefined,
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
    }
    onOpenChange(nextOpen);
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      await enrollClub(camporeeId, { club_section_id: values.club_section_id });
      toast.success("Club inscrito en el camporee");
      onSuccess();
      handleOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo inscribir el club";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Inscribir club</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Club section ID */}
          <div className="space-y-1.5">
            <Label htmlFor="club_section_id">ID de sección de club *</Label>
            <Input
              id="club_section_id"
              type="number"
              min={1}
              {...register("club_section_id")}
              placeholder="Ej. 42"
            />
            {errors.club_section_id && (
              <p className="text-xs text-destructive">
                {errors.club_section_id.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Ingrese el ID de la sección de club que desea inscribir.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Inscribiendo..." : "Inscribir club"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
