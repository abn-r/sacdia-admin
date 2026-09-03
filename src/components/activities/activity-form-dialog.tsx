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
import { Minus, Plus, Repeat } from "lucide-react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createActivity,
  createActivitySeries,
  getCurrentEcclesiasticalYearFromClient,
  previewActivitySeries,
  updateActivity,
} from "@/lib/api/activities";
import type { Activity, ActivitySeriesPreview } from "@/lib/api/activities";
import { ActivitySeriesPreviewList } from "@/components/activities/activity-series-preview";
import { toDateKey } from "@/lib/activities/helpers";

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
    activity_date: z.string().optional(),
    activity_end_date: z.string().optional(),
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
  const [repeat, setRepeat] = useState(false);
  const [repeatKind, setRepeatKind] = useState<"interval" | "weekly">("weekly");
  const [intervalDays, setIntervalDays] = useState(7);
  const [weekday, setWeekday] = useState(7);
  const [until, setUntil] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [preview, setPreview] = useState<ActivitySeriesPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const tSeries = useTranslations("activities.series");
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
      activity_date: "",
      activity_end_date: "",
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
          activity_date: activity.activity_date ?? "",
          activity_end_date: activity.activity_end_date ?? "",
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
          activity_date: toDateKey(new Date()),
          activity_end_date: "",
          image: "",
          platform: 0,
          link_meet: "",
        });
      }
    }
  }, [open, activity, sections, form]);

  useEffect(() => {
    if (!open || isEdit) {
      setRepeat(false);
      setPreview(null);
      return;
    }
    void getCurrentEcclesiasticalYearFromClient()
      .then((year) => {
        const end = (year.end_date ?? "").slice(0, 10);
        setYearEnd(end);
        setUntil((current) => current || end);
      })
      .catch(() => {
        setYearEnd("");
      });
  }, [open, isEdit]);

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
          activity_date: values.activity_date || undefined,
          activity_end_date: values.activity_end_date || undefined,
          activity_place: values.activity_place,
          image: values.image,
          platform: values.platform,
          link_meet: values.link_meet,
        });
        toast.success(t("toasts.updated"));
      } else if (repeat) {
        if (!values.activity_date) {
          toast.error(tSeries("dateRequired"));
          return;
        }
        const payload = {
          name: values.name,
          description: values.description,
          activity_type_id: values.activity_type_id,
          club_type_id: values.club_type_id,
          club_section_id: values.club_section_id,
          lat: values.lat,
          long: values.long,
          activity_time: values.activity_time,
          activity_date: values.activity_date,
          activity_end_date: values.activity_end_date || undefined,
          activity_place: values.activity_place,
          image: values.image,
          platform: values.platform,
          link_meet: values.link_meet,
          recurrence: {
            kind: repeatKind,
            interval_days: repeatKind === "interval" ? intervalDays : undefined,
            weekdays: repeatKind === "weekly" ? [weekday] : undefined,
            until: until || undefined,
          },
        };
        const created = await createActivitySeries(clubId, payload);
        toast.success(tSeries("created", { count: created.created_count ?? preview?.count ?? 0 }));
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
          activity_date: values.activity_date || undefined,
          activity_end_date: values.activity_end_date || undefined,
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
  const activityDate = form.watch("activity_date");

  // Filter sections by selected club type
  const filteredSections = sections.filter(
    (s) => s.club_type_id === Number(clubTypeId),
  );

  useEffect(() => {
    if (!repeat || isEdit || !open || !activityDate) {
      setPreview(null);
      setPreviewError(false);
      return;
    }
    const handle = window.setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError(false);
      const image = form.getValues("image");
      void previewActivitySeries(clubId, {
        name: form.getValues("name") || "Serie",
        activity_type_id: form.getValues("activity_type_id"),
        club_type_id: form.getValues("club_type_id"),
        club_section_id: form.getValues("club_section_id"),
        lat: form.getValues("lat"),
        long: form.getValues("long"),
        activity_time: form.getValues("activity_time"),
        activity_date: activityDate,
        activity_end_date: form.getValues("activity_end_date") || undefined,
        activity_place: form.getValues("activity_place") || "place",
        ...(image ? { image } : {}),
        platform: form.getValues("platform"),
        recurrence: {
          kind: repeatKind,
          interval_days: repeatKind === "interval" ? intervalDays : undefined,
          weekdays: repeatKind === "weekly" ? [weekday] : undefined,
          until: until || undefined,
        },
      })
        .then((result) => {
          setPreview(result);
          setPreviewError(false);
        })
        .catch(() => {
          setPreview(null);
          setPreviewError(true);
        })
        .finally(() => setPreviewLoading(false));
    }, 350);
    return () => window.clearTimeout(handle);
  }, [
    repeat,
    isEdit,
    open,
    activityDate,
    repeatKind,
    intervalDays,
    weekday,
    until,
    clubId,
    form,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar actividad" : "Nueva actividad"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos de la actividad y guarda los cambios."
              : "Completa el formulario para registrar una nueva actividad en el club."}
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

            {/* Fecha */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="activity_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {repeat ? tSeries("firstDate") : tSeries("sessionDate")}
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" min={toDateKey(new Date())} max={yearEnd || undefined} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="activity_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tSeries("endDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" min={activityDate || toDateKey(new Date())} max={yearEnd || undefined} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEdit ? (
              <div
                className={cn(
                  "space-y-3 rounded-2xl border p-3",
                  repeat
                    ? "border-success/30 bg-success/10"
                    : "border-border/70 bg-muted/20",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                        repeat ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Repeat className="size-4" aria-hidden />
                    </div>
                    <div>
                      <Label htmlFor="repeat-activity" className="text-sm font-medium">
                        {tSeries("toggle")}
                      </Label>
                      <p className="text-xs text-muted-foreground">{tSeries("toggleHelp")}</p>
                    </div>
                  </div>
                  <Switch
                    id="repeat-activity"
                    checked={repeat}
                    onCheckedChange={setRepeat}
                  />
                </div>

                {repeat ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-background/80 p-1 ring-1 ring-border/60">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={
                          repeatKind === "weekly"
                            ? "bg-success text-white hover:bg-success/90 hover:text-white"
                            : undefined
                        }
                        onClick={() => setRepeatKind("weekly")}
                      >
                        {tSeries("kindWeekly")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={
                          repeatKind === "interval"
                            ? "bg-success text-white hover:bg-success/90 hover:text-white"
                            : undefined
                        }
                        onClick={() => setRepeatKind("interval")}
                      >
                        {tSeries("kindInterval")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {repeatKind === "weekly"
                        ? tSeries("kindWeeklyHint")
                        : tSeries("kindIntervalHint")}
                    </p>

                    {repeatKind === "weekly" ? (
                      <div className="space-y-1.5">
                        <Label>{tSeries("weekday")}</Label>
                        <div className="grid grid-cols-7 gap-1">
                          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                            <Button
                              key={day}
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-pressed={weekday === day}
                              className={cn(
                                "h-9 px-0 text-[11px]",
                                weekday === day
                                  ? "bg-success text-white hover:bg-success/90 hover:text-white"
                                  : "bg-background",
                              )}
                              onClick={() => setWeekday(day)}
                            >
                              {tSeries(`weekdaysShort.${day}`)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label htmlFor="interval-days">{tSeries("everyDays")}</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            aria-label={tSeries("intervalDecrease")}
                            disabled={intervalDays <= 1}
                            onClick={() => setIntervalDays((value) => Math.max(1, value - 1))}
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <Input
                            id="interval-days"
                            type="number"
                            min={1}
                            max={365}
                            className="w-20 text-center font-mono"
                            value={intervalDays}
                            onChange={(event) =>
                              setIntervalDays(
                                Math.min(365, Math.max(1, Number(event.target.value) || 1)),
                              )
                            }
                          />
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            aria-label={tSeries("intervalIncrease")}
                            disabled={intervalDays >= 365}
                            onClick={() => setIntervalDays((value) => Math.min(365, value + 1))}
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="series-until">{tSeries("until")}</Label>
                      <Input
                        id="series-until"
                        type="date"
                        min={activityDate || toDateKey(new Date())}
                        max={yearEnd || undefined}
                        value={until}
                        onChange={(event) => setUntil(event.target.value)}
                      />
                    </div>

                    <ActivitySeriesPreviewList
                      preview={preview}
                      isLoading={previewLoading}
                      error={previewError}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

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
                    ? tSeries("saving")
                    : tSeries("creating")
                  : isEdit
                    ? tSeries("saveChanges")
                    : repeat
                      ? tSeries("createMany", { count: preview?.count ?? 0 })
                      : tSeries("createOne")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
