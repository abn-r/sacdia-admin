"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import { Switch } from "@/components/ui/switch";
import {
  createTemplateSection,
  updateTemplateSection,
} from "@/lib/api/annual-folders";
import type { FolderTemplateSection } from "@/lib/api/annual-folders";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede superar 100 caracteres"),
  description: z
    .string()
    .max(500, "La descripción no puede superar 500 caracteres")
    .optional(),
  order: z.coerce.number().int().min(1, "El orden debe ser al menos 1"),
  required: z.boolean(),
  max_points: z.coerce
    .number()
    .int()
    .min(0, "Los puntos máximos no pueden ser negativos"),
  minimum_points: z.coerce
    .number()
    .int()
    .min(0, "Los puntos mínimos no pueden ser negativos"),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  section?: FolderTemplateSection | null;
  nextOrder?: number;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SectionFormDialog({
  open,
  onOpenChange,
  templateId,
  section,
  nextOrder = 1,
  onSuccess,
}: SectionFormDialogProps) {
  const t = useTranslations("annual_folders");
  const isEdit = !!section;
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
      order: nextOrder,
      required: true,
      max_points: 0,
      minimum_points: 0,
    },
  });

  const requiredValue = watch("required");

  useEffect(() => {
    if (open) {
      if (section) {
        reset({
          name: section.name,
          description: section.description ?? "",
          order: section.order,
          required: section.required,
          max_points: section.max_points,
          minimum_points: section.minimum_points,
        });
      } else {
        reset({
          name: "",
          description: "",
          order: nextOrder,
          required: true,
          max_points: 0,
          minimum_points: 0,
        });
      }
    }
  }, [open, section, nextOrder, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      if (isEdit && section) {
        await updateTemplateSection(section.section_id, {
          name: values.name,
          description: values.description || undefined,
          order: values.order,
          required: values.required,
          max_points: values.max_points,
          minimum_points: values.minimum_points,
        });
        toast.success(t("toasts.section_updated"));
      } else {
        await createTemplateSection(templateId, {
          name: values.name,
          description: values.description || undefined,
          order: values.order,
          required: values.required,
          max_points: values.max_points,
          minimum_points: values.minimum_points,
        });
        toast.success(t("toasts.section_created"));
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al guardar la sección";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar sección" : "Nueva sección"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="section-name">Nombre *</Label>
            <Input
              id="section-name"
              {...register("name")}
              placeholder="Ej. Evidencias de actividades"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="section-description">Descripción</Label>
            <Textarea
              id="section-description"
              {...register("description")}
              placeholder="Descripción opcional de la sección"
              rows={3}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Orden */}
          <div className="space-y-1.5">
            <Label htmlFor="section-order">Orden *</Label>
            <Input
              id="section-order"
              type="number"
              min={1}
              {...register("order")}
              placeholder="1"
            />
            {errors.order && (
              <p className="text-xs text-destructive">{errors.order.message}</p>
            )}
          </div>

          {/* Requerida */}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div className="space-y-0.5">
              <Label htmlFor="section-required" className="cursor-pointer text-sm font-medium">
                Sección requerida
              </Label>
              <p className="text-xs text-muted-foreground">
                El miembro debe subir evidencia para esta sección
              </p>
            </div>
            <Switch
              id="section-required"
              checked={requiredValue}
              onCheckedChange={(checked) => setValue("required", checked)}
            />
          </div>

          {/* Puntos */}
          <div className="grid grid-cols-2 gap-3">
            {/* Puntos máximos */}
            <div className="space-y-1.5">
              <Label htmlFor="section-max-points">Puntos máximos *</Label>
              <Input
                id="section-max-points"
                type="number"
                min={0}
                {...register("max_points")}
                placeholder="0"
              />
              {errors.max_points && (
                <p className="text-xs text-destructive">
                  {errors.max_points.message}
                </p>
              )}
            </div>

            {/* Puntos mínimos */}
            <div className="space-y-1.5">
              <Label htmlFor="section-minimum-points">Puntos mínimos</Label>
              <Input
                id="section-minimum-points"
                type="number"
                min={0}
                {...register("minimum_points")}
                placeholder="0"
              />
              {errors.minimum_points && (
                <p className="text-xs text-destructive">
                  {errors.minimum_points.message}
                </p>
              )}
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
                  : "Crear sección"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
