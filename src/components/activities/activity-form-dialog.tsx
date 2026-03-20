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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createActivity, updateActivity } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  activity_type_id: z.coerce.number().int().min(1, "Selecciona un tipo"),
  club_type_id: z.coerce.number().int().min(1, "Selecciona el tipo de club"),
  club_section_id: z.coerce.number().int().min(1, "Selecciona la sección"),
  lat: z.coerce.number().min(-90).max(90),
  long: z.coerce.number().min(-180).max(180),
  activity_time: z.string().optional(),
  activity_place: z.string().min(1, "El lugar es obligatorio"),
  image: z.string().min(1, "La URL de imagen es obligatoria"),
  platform: z.coerce.number().int().min(0).max(2).optional(),
  link_meet: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Catalog options ──────────────────────────────────────────────────────────

const ACTIVITY_TYPES = [
  { value: 1, label: "Regular" },
  { value: 2, label: "Especial" },
  { value: 3, label: "Camporee" },
];

const CLUB_TYPES = [
  { value: 1, label: "Aventureros" },
  { value: 2, label: "Conquistadores" },
  { value: 3, label: "Guías Mayores" },
];

const PLATFORMS = [
  { value: 0, label: "Presencial" },
  { value: 1, label: "Virtual" },
  { value: 2, label: "Híbrido" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  /** Sections for the selected club — array of { club_section_id, name } */
  sections: Array<{ club_section_id: number; name: string; club_type_id: number }>;
  activity?: Activity | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityFormDialog({
  open,
  onOpenChange,
  clubId,
  sections,
  activity,
  onSuccess,
}: ActivityFormDialogProps) {
  const isEdit = !!activity;
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
      activity_type_id: 1,
      club_type_id: 1,
      club_section_id: 0,
      lat: 0,
      long: 0,
      activity_time: "09:00",
      activity_place: "",
      image: "",
      platform: 0,
      link_meet: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (activity) {
        reset({
          name: activity.name,
          description: activity.description ?? "",
          activity_type_id: activity.activity_type_id,
          club_type_id: activity.club_type_id,
          club_section_id: activity.club_section_id,
          lat: activity.lat,
          long: activity.long,
          activity_time: activity.activity_time ?? "09:00",
          activity_place: activity.activity_place,
          image: activity.image ?? "",
          platform: activity.platform ?? 0,
          link_meet: activity.link_meet ?? "",
        });
      } else {
        reset({
          name: "",
          description: "",
          activity_type_id: 1,
          club_type_id: sections[0]?.club_type_id ?? 1,
          club_section_id: sections[0]?.club_section_id ?? 0,
          lat: 0,
          long: 0,
          activity_time: "09:00",
          activity_place: "",
          image: "",
          platform: 0,
          link_meet: "",
        });
      }
    }
  }, [open, activity, sections, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      if (isEdit && activity) {
        await updateActivity(activity.activity_id, {
          name: values.name,
          description: values.description,
          activity_type_id: values.activity_type_id,
          lat: values.lat,
          long: values.long,
          activity_time: values.activity_time,
          activity_place: values.activity_place,
          image: values.image,
          platform: values.platform,
          link_meet: values.link_meet,
        });
        toast.success("Actividad actualizada correctamente");
      } else {
        await createActivity(clubId, {
          name: values.name,
          description: values.description,
          activity_type_id: values.activity_type_id,
          club_type_id: values.club_type_id,
          club_section_id: values.club_section_id,
          lat: values.lat,
          long: values.long,
          activity_time: values.activity_time,
          activity_place: values.activity_place,
          image: values.image,
          platform: values.platform,
          link_meet: values.link_meet,
        });
        toast.success("Actividad creada correctamente");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al guardar la actividad";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const platform = watch("platform");
  const clubTypeId = watch("club_type_id");

  // Filter sections by selected club type
  const filteredSections = sections.filter(
    (s) => s.club_type_id === Number(clubTypeId),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar actividad" : "Nueva actividad"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" {...register("name")} placeholder="Nombre de la actividad" />
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
              placeholder="Descripción opcional"
              rows={3}
            />
          </div>

          {/* Tipo de actividad */}
          <div className="space-y-1.5">
            <Label>Tipo de actividad *</Label>
            <Select
              defaultValue={String(activity?.activity_type_id ?? 1)}
              onValueChange={(val) => setValue("activity_type_id", Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={String(t.value)}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.activity_type_id && (
              <p className="text-xs text-destructive">
                {errors.activity_type_id.message}
              </p>
            )}
          </div>

          {/* Tipo de club + Sección (solo al crear) */}
          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label>Tipo de club *</Label>
                <Select
                  defaultValue={String(sections[0]?.club_type_id ?? 1)}
                  onValueChange={(val) => {
                    setValue("club_type_id", Number(val));
                    // Reset section when club type changes
                    const firstMatch = sections.find(
                      (s) => s.club_type_id === Number(val),
                    );
                    setValue("club_section_id", firstMatch?.club_section_id ?? 0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo de club" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLUB_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={String(ct.value)}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.club_type_id && (
                  <p className="text-xs text-destructive">
                    {errors.club_type_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Sección del club *</Label>
                <Select
                  value={String(watch("club_section_id"))}
                  onValueChange={(val) => setValue("club_section_id", Number(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sección" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSections.length > 0 ? (
                      filteredSections.map((s) => (
                        <SelectItem
                          key={s.club_section_id}
                          value={String(s.club_section_id)}
                        >
                          {s.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="0" disabled>
                        No hay secciones para este tipo
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.club_section_id && (
                  <p className="text-xs text-destructive">
                    {errors.club_section_id.message}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Lugar */}
          <div className="space-y-1.5">
            <Label htmlFor="activity_place">Lugar *</Label>
            <Input
              id="activity_place"
              {...register("activity_place")}
              placeholder="Ej. Iglesia Central"
            />
            {errors.activity_place && (
              <p className="text-xs text-destructive">
                {errors.activity_place.message}
              </p>
            )}
          </div>

          {/* Hora */}
          <div className="space-y-1.5">
            <Label htmlFor="activity_time">Hora (HH:mm)</Label>
            <Input
              id="activity_time"
              type="time"
              {...register("activity_time")}
            />
          </div>

          {/* Coordenadas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lat">Latitud *</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                {...register("lat")}
                placeholder="0.000000"
              />
              {errors.lat && (
                <p className="text-xs text-destructive">{errors.lat.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="long">Longitud *</Label>
              <Input
                id="long"
                type="number"
                step="any"
                {...register("long")}
                placeholder="0.000000"
              />
              {errors.long && (
                <p className="text-xs text-destructive">
                  {errors.long.message}
                </p>
              )}
            </div>
          </div>

          {/* Modalidad */}
          <div className="space-y-1.5">
            <Label>Modalidad</Label>
            <Select
              defaultValue={String(activity?.platform ?? 0)}
              onValueChange={(val) => setValue("platform", Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar modalidad" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={String(p.value)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link de reunión — solo si virtual o híbrido */}
          {(platform === 1 || platform === 2) && (
            <div className="space-y-1.5">
              <Label htmlFor="link_meet">Enlace de reunión virtual</Label>
              <Input
                id="link_meet"
                {...register("link_meet")}
                placeholder="https://meet.google.com/..."
                type="url"
              />
            </div>
          )}

          {/* URL de imagen */}
          <div className="space-y-1.5">
            <Label htmlFor="image">URL de imagen *</Label>
            <Input
              id="image"
              {...register("image")}
              placeholder="https://..."
              type="url"
            />
            {errors.image && (
              <p className="text-xs text-destructive">{errors.image.message}</p>
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
              {isSubmitting
                ? isEdit
                  ? "Guardando..."
                  : "Creando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear actividad"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
