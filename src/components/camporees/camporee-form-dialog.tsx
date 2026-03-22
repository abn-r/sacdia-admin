"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createCamporee, updateCamporee } from "@/lib/api/camporees";
import type { Camporee } from "@/lib/api/camporees";

// ─── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    description: z.string().optional(),
    start_date: z.string().min(1, "La fecha de inicio es obligatoria"),
    end_date: z.string().min(1, "La fecha de fin es obligatoria"),
    local_camporee_place: z.string().min(1, "El lugar es obligatorio"),
    local_field_id: z.coerce.number().int().min(1, "El campo local es obligatorio"),
    registration_cost: z.coerce.number().min(0).optional(),
    includes_adventurers: z.boolean(),
    includes_pathfinders: z.boolean(),
    includes_master_guides: z.boolean(),
  })
  .refine((data) => data.start_date <= data.end_date, {
    message: "La fecha de fin debe ser igual o posterior a la fecha de inicio",
    path: ["end_date"],
  });

type FormValues = z.infer<typeof formSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CamporeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporee?: Camporee | null;
  onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(dateStr?: string | null): string {
  if (!dateStr) return "";
  // Accepts ISO strings like "2024-05-15T00:00:00.000Z" or "2024-05-15"
  return dateStr.split("T")[0] ?? "";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CamporeeFormDialog({
  open,
  onOpenChange,
  camporee,
  onSuccess,
}: CamporeeFormDialogProps) {
  const isEdit = !!camporee;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      name: "",
      description: "",
      start_date: "",
      end_date: "",
      local_camporee_place: "",
      local_field_id: 0,
      registration_cost: undefined,
      includes_adventurers: false,
      includes_pathfinders: true,
      includes_master_guides: false,
    },
  });

  const includesAdventurers = watch("includes_adventurers");
  const includesPathfinders = watch("includes_pathfinders");
  const includesMasterGuides = watch("includes_master_guides");

  useEffect(() => {
    if (open) {
      if (camporee) {
        reset({
          name: camporee.name,
          description: camporee.description ?? "",
          start_date: toDateInput(camporee.start_date),
          end_date: toDateInput(camporee.end_date),
          local_camporee_place: camporee.local_camporee_place ?? "",
          local_field_id: camporee.local_field_id ?? 0,
          registration_cost: camporee.registration_cost ?? undefined,
          includes_adventurers: camporee.includes_adventurers ?? false,
          includes_pathfinders: camporee.includes_pathfinders ?? true,
          includes_master_guides: camporee.includes_master_guides ?? false,
        });
      } else {
        reset({
          name: "",
          description: "",
          start_date: "",
          end_date: "",
          local_camporee_place: "",
          local_field_id: 0,
          registration_cost: undefined,
          includes_adventurers: false,
          includes_pathfinders: true,
          includes_master_guides: false,
        });
      }
    }
  }, [open, camporee, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      if (isEdit && camporee) {
        const id = camporee.camporee_id ?? camporee.id ?? 0;
        await updateCamporee(id, {
          name: values.name,
          description: values.description,
          start_date: values.start_date,
          end_date: values.end_date,
          local_camporee_place: values.local_camporee_place,
          local_field_id: values.local_field_id,
          registration_cost: values.registration_cost,
          includes_adventurers: values.includes_adventurers,
          includes_pathfinders: values.includes_pathfinders,
          includes_master_guides: values.includes_master_guides,
        });
        toast.success("Camporee actualizado correctamente");
      } else {
        await createCamporee({
          name: values.name,
          description: values.description,
          start_date: values.start_date,
          end_date: values.end_date,
          local_camporee_place: values.local_camporee_place,
          local_field_id: values.local_field_id,
          registration_cost: values.registration_cost,
          includes_adventurers: values.includes_adventurers,
          includes_pathfinders: values.includes_pathfinders,
          includes_master_guides: values.includes_master_guides,
        });
        toast.success("Camporee creado correctamente");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al guardar el camporee";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar camporee" : "Nuevo camporee"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Ej. Camporee de Primavera 2025"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Descripción opcional del camporee"
              rows={3}
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Fecha de inicio *</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
              {errors.start_date && (
                <p className="text-xs text-destructive">
                  {errors.start_date.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Fecha de fin *</Label>
              <Input id="end_date" type="date" {...register("end_date")} />
              {errors.end_date && (
                <p className="text-xs text-destructive">
                  {errors.end_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Lugar */}
          <div className="space-y-1.5">
            <Label htmlFor="local_camporee_place">Lugar *</Label>
            <Input
              id="local_camporee_place"
              {...register("local_camporee_place")}
              placeholder="Ej. Centro Recreacional La Montaña"
            />
            {errors.local_camporee_place && (
              <p className="text-xs text-destructive">
                {errors.local_camporee_place.message}
              </p>
            )}
          </div>

          {/* Campo local */}
          <div className="space-y-1.5">
            <Label htmlFor="local_field_id">ID del campo local *</Label>
            <Input
              id="local_field_id"
              type="number"
              min={1}
              {...register("local_field_id")}
              placeholder="1"
            />
            {errors.local_field_id && (
              <p className="text-xs text-destructive">
                {errors.local_field_id.message}
              </p>
            )}
          </div>

          {/* Costo de inscripción */}
          <div className="space-y-1.5">
            <Label htmlFor="registration_cost">Costo de inscripción</Label>
            <Input
              id="registration_cost"
              type="number"
              min={0}
              step="0.01"
              {...register("registration_cost")}
              placeholder="0.00"
            />
            {errors.registration_cost && (
              <p className="text-xs text-destructive">
                {errors.registration_cost.message}
              </p>
            )}
          </div>

          {/* Tipos de club */}
          <div className="space-y-2">
            <Label>Incluye</Label>
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includes_adventurers"
                  checked={includesAdventurers}
                  onCheckedChange={(checked) =>
                    setValue("includes_adventurers", checked === true)
                  }
                />
                <Label htmlFor="includes_adventurers" className="font-normal cursor-pointer">
                  Aventureros
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includes_pathfinders"
                  checked={includesPathfinders}
                  onCheckedChange={(checked) =>
                    setValue("includes_pathfinders", checked === true)
                  }
                />
                <Label htmlFor="includes_pathfinders" className="font-normal cursor-pointer">
                  Conquistadores
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includes_master_guides"
                  checked={includesMasterGuides}
                  onCheckedChange={(checked) =>
                    setValue("includes_master_guides", checked === true)
                  }
                />
                <Label htmlFor="includes_master_guides" className="font-normal cursor-pointer">
                  Guías Mayores
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? "Guardando..."
                  : "Creando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear camporee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
