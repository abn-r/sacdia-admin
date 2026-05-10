"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTranslations } from "next-intl";
import { createActivity, updateActivity } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";

// ─── Schema factory ───────────────────────────────────────────────────────────

function buildSchema(t: ReturnType<typeof useTranslations<"activities.validation">>) {
  return z.object({
    name: z.string().min(1, t("name_required")),
    description: z.string().optional(),
    activity_type_id: z.coerce.number().int().min(1, t("activity_type_required")),
    club_type_id: z.coerce.number().int().min(1, t("club_type_required")),
    club_section_id: z.coerce.number().int().min(1, t("club_section_required")),
    lat: z.coerce.number().min(-90).max(90),
    long: z.coerce.number().min(-180).max(180),
    activity_time: z.string().optional(),
    activity_place: z.string().min(1, t("activity_place_required")),
    image: z.string().min(1, t("image_required")),
    platform: z.coerce.number().int().min(0).max(2).optional(),
    link_meet: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

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
  const t = useTranslations("activities");
  const tVal = useTranslations("activities.validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const schema = useMemo(() => buildSchema(tVal), [tVal]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as z.ZodType<FormValues, FormValues>),
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
        form.reset({
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
        form.reset({
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
  }, [open, activity, sections, form]);

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
        toast.success(t("toasts.updated"));
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
        toast.success(t("toasts.created"));
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.save_failed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const platform = form.watch("platform");
  const clubTypeId = form.watch("club_type_id");

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
          <DialogDescription>
            {isEdit
              ? "Modificá los datos de la actividad y guardá los cambios."
              : "Completá el formulario para registrar una nueva actividad en el club."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      aria-required="true"
                      placeholder={t("placeholders.name")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("placeholders.description")}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de actividad */}
            <FormField
              control={form.control}
              name="activity_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tipo de actividad <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    defaultValue={String(activity?.activity_type_id ?? 1)}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <FormControl>
                      <SelectTrigger aria-required="true">
                        <SelectValue placeholder={t("placeholders.selectType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((at) => (
                        <SelectItem key={at.value} value={String(at.value)}>
                          {at.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de club + Sección (solo al crear) */}
            {!isEdit && (
              <>
                <FormField
                  control={form.control}
                  name="club_type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tipo de club <span aria-hidden="true" className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        defaultValue={String(sections[0]?.club_type_id ?? 1)}
                        onValueChange={(val) => {
                          field.onChange(Number(val));
                          // Reset section when club type changes
                          const firstMatch = sections.find(
                            (s) => s.club_type_id === Number(val),
                          );
                          form.setValue("club_section_id", firstMatch?.club_section_id ?? 0);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger aria-required="true">
                            <SelectValue placeholder={t("placeholders.selectClubType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CLUB_TYPES.map((ct) => (
                            <SelectItem key={ct.value} value={String(ct.value)}>
                              {ct.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="club_section_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Sección del club <span aria-hidden="true" className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(val) => field.onChange(Number(val))}
                      >
                        <FormControl>
                          <SelectTrigger aria-required="true">
                            <SelectValue placeholder={t("placeholders.selectSection")} />
                          </SelectTrigger>
                        </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Lugar */}
            <FormField
              control={form.control}
              name="activity_place"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Lugar <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      aria-required="true"
                      placeholder={t("placeholders.location")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hora */}
            <FormField
              control={form.control}
              name="activity_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora (HH:mm)</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coordenadas */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Latitud <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        aria-required="true"
                        placeholder={t("placeholders.latitude")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="long"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Longitud <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        aria-required="true"
                        placeholder={t("placeholders.longitude")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Modalidad */}
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modalidad</FormLabel>
                  <Select
                    defaultValue={String(activity?.platform ?? 0)}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("placeholders.selectModality")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p.value} value={String(p.value)}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Link de reunión — solo si virtual o híbrido */}
            {(platform === 1 || platform === 2) && (
              <FormField
                control={form.control}
                name="link_meet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enlace de reunión virtual</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder={t("placeholders.meetUrl")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* URL de imagen */}
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    URL de imagen <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      aria-required="true"
                      placeholder={t("placeholders.externalUrl")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
