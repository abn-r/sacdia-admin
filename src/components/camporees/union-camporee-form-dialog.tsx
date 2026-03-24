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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUnionCamporee, updateUnionCamporee } from "@/lib/api/camporees";
import type { UnionCamporee } from "@/lib/api/camporees";
import type { Union } from "@/lib/api/geography";

// ─── Schema ────────────────────────────────────────────────────────────────────

const formSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    description: z.string().optional(),
    start_date: z.string().min(1, "La fecha de inicio es obligatoria"),
    end_date: z.string().min(1, "La fecha de fin es obligatoria"),
    union_id: z.coerce.number().int().min(1, "La unión es obligatoria"),
    place: z.string().min(1, "El lugar es obligatorio"),
    registration_cost: z.coerce.number().min(0).optional(),
    includes_adventurers: z.boolean(),
    includes_pathfinders: z.boolean(),
    includes_master_guides: z.boolean(),
  })
  .refine((data) => data.start_date <= data.end_date, {
    message: "La fecha de fin debe ser igual o posterior a la de inicio",
    path: ["end_date"],
  });

type FormValues = z.infer<typeof formSchema>;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface UnionCamporeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporee?: UnionCamporee | null;
  unions: Union[];
  onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInput(dateStr?: string | null): string {
  if (!dateStr) return "";
  return dateStr.split("T")[0] ?? "";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnionCamporeeFormDialog({
  open,
  onOpenChange,
  camporee,
  unions,
  onSuccess,
}: UnionCamporeeFormDialogProps) {
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
      union_id: 0,
      place: "",
      registration_cost: undefined,
      includes_adventurers: false,
      includes_pathfinders: true,
      includes_master_guides: false,
    },
  });

  const includesAdventurers = watch("includes_adventurers");
  const includesPathfinders = watch("includes_pathfinders");
  const includesMasterGuides = watch("includes_master_guides");
  const unionId = watch("union_id");

  useEffect(() => {
    if (open) {
      if (camporee) {
        reset({
          name: camporee.name,
          description: camporee.description ?? "",
          start_date: toDateInput(camporee.start_date),
          end_date: toDateInput(camporee.end_date),
          union_id: camporee.union_id ?? 0,
          place: camporee.place ?? "",
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
          union_id: 0,
          place: "",
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
      const payload = {
        name: values.name,
        description: values.description,
        start_date: values.start_date,
        end_date: values.end_date,
        union_id: values.union_id,
        place: values.place,
        registration_cost: values.registration_cost,
        includes_adventurers: values.includes_adventurers,
        includes_pathfinders: values.includes_pathfinders,
        includes_master_guides: values.includes_master_guides,
      };

      if (isEdit && camporee) {
        const id = camporee.union_camporee_id ?? camporee.id ?? 0;
        await updateUnionCamporee(id, payload);
        toast.success("Camporee de unión actualizado correctamente");
      } else {
        await createUnionCamporee(payload);
        toast.success("Camporee de unión creado correctamente");
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
            {isEdit ? "Editar camporee de unión" : "Nuevo camporee de unión"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="uc-name">Nombre *</Label>
            <Input
              id="uc-name"
              {...register("name")}
              placeholder="Ej. Camporee de Unión 2025"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="uc-description">Descripción</Label>
            <Textarea
              id="uc-description"
              {...register("description")}
              placeholder="Descripción opcional del camporee"
              rows={3}
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="uc-start_date">Fecha de inicio *</Label>
              <Input id="uc-start_date" type="date" {...register("start_date")} />
              {errors.start_date && (
                <p className="text-xs text-destructive">{errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uc-end_date">Fecha de fin *</Label>
              <Input id="uc-end_date" type="date" {...register("end_date")} />
              {errors.end_date && (
                <p className="text-xs text-destructive">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* Unión */}
          <div className="space-y-1.5">
            <Label htmlFor="uc-union_id">Unión *</Label>
            <Select
              value={unionId > 0 ? String(unionId) : ""}
              onValueChange={(val) => setValue("union_id", Number(val))}
            >
              <SelectTrigger id="uc-union_id" className="w-full">
                <SelectValue placeholder="Selecciona una unión..." />
              </SelectTrigger>
              <SelectContent>
                {unions.map((u) => (
                  <SelectItem key={u.union_id} value={String(u.union_id)}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.union_id && (
              <p className="text-xs text-destructive">{errors.union_id.message}</p>
            )}
          </div>

          {/* Lugar */}
          <div className="space-y-1.5">
            <Label htmlFor="uc-place">Lugar *</Label>
            <Input
              id="uc-place"
              {...register("place")}
              placeholder="Ej. Centro Recreacional Nacional"
            />
            {errors.place && (
              <p className="text-xs text-destructive">{errors.place.message}</p>
            )}
          </div>

          {/* Costo de inscripción */}
          <div className="space-y-1.5">
            <Label htmlFor="uc-registration_cost">Costo de inscripción</Label>
            <Input
              id="uc-registration_cost"
              type="number"
              min={0}
              step="0.01"
              {...register("registration_cost")}
              placeholder="0.00"
            />
            {errors.registration_cost && (
              <p className="text-xs text-destructive">{errors.registration_cost.message}</p>
            )}
          </div>

          {/* Tipos de club */}
          <div className="space-y-2">
            <Label>Incluye</Label>
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="uc-includes_adventurers"
                  checked={includesAdventurers}
                  onCheckedChange={(checked) =>
                    setValue("includes_adventurers", checked === true)
                  }
                />
                <Label
                  htmlFor="uc-includes_adventurers"
                  className="cursor-pointer font-normal"
                >
                  Aventureros
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="uc-includes_pathfinders"
                  checked={includesPathfinders}
                  onCheckedChange={(checked) =>
                    setValue("includes_pathfinders", checked === true)
                  }
                />
                <Label
                  htmlFor="uc-includes_pathfinders"
                  className="cursor-pointer font-normal"
                >
                  Conquistadores
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="uc-includes_master_guides"
                  checked={includesMasterGuides}
                  onCheckedChange={(checked) =>
                    setValue("includes_master_guides", checked === true)
                  }
                />
                <Label
                  htmlFor="uc-includes_master_guides"
                  className="cursor-pointer font-normal"
                >
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
