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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTemplate } from "@/lib/api/annual-folders";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede superar 100 caracteres"),
  club_type_id: z.coerce.number().int().positive("Selecciona un tipo de club"),
  ecclesiastical_year_id: z.coerce
    .number()
    .int()
    .positive("Selecciona un año eclesiástico"),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplateFormDialog({
  open,
  onOpenChange,
  clubTypes,
  ecclesiasticalYears,
  onSuccess,
}: TemplateFormDialogProps) {
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
      club_type_id: clubTypes[0]?.club_type_id ?? 0,
      ecclesiastical_year_id:
        ecclesiasticalYears.find((y) => y.active)?.ecclesiastical_year_id ??
        ecclesiasticalYears[0]?.ecclesiastical_year_id ??
        0,
    },
  });

  const clubTypeValue = watch("club_type_id");
  const yearValue = watch("ecclesiastical_year_id");

  useEffect(() => {
    if (open) {
      reset({
        name: "",
        club_type_id: clubTypes[0]?.club_type_id ?? 0,
        ecclesiastical_year_id:
          ecclesiasticalYears.find((y) => y.active)?.ecclesiastical_year_id ??
          ecclesiasticalYears[0]?.ecclesiastical_year_id ??
          0,
      });
    }
  }, [open, clubTypes, ecclesiasticalYears, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      await createTemplate({
        name: values.name,
        club_type_id: values.club_type_id,
        ecclesiastical_year_id: values.ecclesiastical_year_id,
      });
      toast.success("Plantilla creada correctamente");
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al crear la plantilla";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva plantilla</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Nombre *</Label>
            <Input
              id="template-name"
              {...register("name")}
              placeholder="Ej. Carpeta Conquistadores 2025"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Tipo de club */}
          <div className="space-y-1.5">
            <Label>Tipo de club *</Label>
            <Select
              value={String(clubTypeValue)}
              onValueChange={(val) => setValue("club_type_id", Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo de club" />
              </SelectTrigger>
              <SelectContent>
                {clubTypes.length > 0 ? (
                  clubTypes.map((ct) => (
                    <SelectItem
                      key={ct.club_type_id}
                      value={String(ct.club_type_id)}
                    >
                      {ct.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="0" disabled>
                    No hay tipos disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.club_type_id && (
              <p className="text-xs text-destructive">
                {errors.club_type_id.message}
              </p>
            )}
          </div>

          {/* Año eclesiástico */}
          <div className="space-y-1.5">
            <Label>Año eclesiástico *</Label>
            <Select
              value={String(yearValue)}
              onValueChange={(val) =>
                setValue("ecclesiastical_year_id", Number(val))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar año" />
              </SelectTrigger>
              <SelectContent>
                {ecclesiasticalYears.length > 0 ? (
                  ecclesiasticalYears.map((year) => (
                    <SelectItem
                      key={year.ecclesiastical_year_id}
                      value={String(year.ecclesiastical_year_id)}
                    >
                      {year.name}
                      {year.active && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (activo)
                        </span>
                      )}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="0" disabled>
                    No hay años disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.ecclesiastical_year_id && (
              <p className="text-xs text-destructive">
                {errors.ecclesiastical_year_id.message}
              </p>
            )}
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
              {isSubmitting ? "Creando..." : "Crear plantilla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
