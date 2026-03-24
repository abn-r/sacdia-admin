"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateManualData, type MonthlyReportManualData } from "@/lib/api/monthly-reports";

// ─── Schema ───────────────────────────────────────────────────────────────────

const manualDataSchema = z.object({
  // Administración
  weekly_meetings_held: z.coerce.number().int().min(0).optional(),
  leadership_meetings: z.coerce.number().int().min(0).optional(),
  parent_meetings: z.coerce.number().int().min(0).optional(),
  special_events: z.coerce.number().int().min(0).optional(),
  administrative_notes: z.string().optional(),
  // Actividad misionera
  bible_studies_conducted: z.coerce.number().int().min(0).optional(),
  souls_won: z.coerce.number().int().min(0).optional(),
  community_outreach_events: z.coerce.number().int().min(0).optional(),
  missionary_trips: z.coerce.number().int().min(0).optional(),
  missionary_notes: z.string().optional(),
  // Servicio
  service_hours_total: z.coerce.number().min(0).optional(),
  service_projects: z.coerce.number().int().min(0).optional(),
  volunteers_count: z.coerce.number().int().min(0).optional(),
  service_notes: z.string().optional(),
  // Extra
  challenges: z.string().optional(),
  highlights: z.string().optional(),
  prayer_requests: z.string().optional(),
});

type FormValues = z.infer<typeof manualDataSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ManualDataFormProps {
  reportId: number;
  initialData?: MonthlyReportManualData | null;
  disabled?: boolean;
  onSuccess?: (data: MonthlyReportManualData) => void;
}

// ─── Field helpers ────────────────────────────────────────────────────────────

interface NumberFieldProps {
  label: string;
  name: keyof FormValues;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: ReturnType<typeof useForm<FormValues>>["register"];
  error?: string;
  disabled?: boolean;
}

function NumberField({ label, name, register, error, disabled }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={name}
        type="number"
        min={0}
        disabled={disabled}
        className="h-8"
        {...register(name)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface TextareaFieldProps {
  label: string;
  name: keyof FormValues;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: ReturnType<typeof useForm<FormValues>>["register"];
  error?: string;
  disabled?: boolean;
  rows?: number;
}

function TextareaField({ label, name, register, error, disabled, rows = 3 }: TextareaFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
      </Label>
      <Textarea
        id={name}
        rows={rows}
        disabled={disabled}
        className="resize-none text-sm"
        {...register(name)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManualDataForm({
  reportId,
  initialData,
  disabled = false,
  onSuccess,
}: ManualDataFormProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(manualDataSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      weekly_meetings_held: initialData?.weekly_meetings_held ?? undefined,
      leadership_meetings: initialData?.leadership_meetings ?? undefined,
      parent_meetings: initialData?.parent_meetings ?? undefined,
      special_events: initialData?.special_events ?? undefined,
      administrative_notes: initialData?.administrative_notes ?? "",
      bible_studies_conducted: initialData?.bible_studies_conducted ?? undefined,
      souls_won: initialData?.souls_won ?? undefined,
      community_outreach_events: initialData?.community_outreach_events ?? undefined,
      missionary_trips: initialData?.missionary_trips ?? undefined,
      missionary_notes: initialData?.missionary_notes ?? "",
      service_hours_total: initialData?.service_hours_total ?? undefined,
      service_projects: initialData?.service_projects ?? undefined,
      volunteers_count: initialData?.volunteers_count ?? undefined,
      service_notes: initialData?.service_notes ?? "",
      challenges: initialData?.challenges ?? "",
      highlights: initialData?.highlights ?? "",
      prayer_requests: initialData?.prayer_requests ?? "",
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setSaving(true);
    try {
      const payload: MonthlyReportManualData = { ...values };
      const updated = await updateManualData(reportId, payload);
      toast.success("Datos manuales guardados correctamente.");
      onSuccess?.(updated.manual_data ?? payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al guardar los datos manuales.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Administración */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Administracion</CardTitle>
          <CardDescription>Reuniones y eventos administrativos del mes.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumberField
            label="Reuniones semanales"
            name="weekly_meetings_held"
            register={register}
            error={errors.weekly_meetings_held?.message}
            disabled={disabled || saving}
          />
          <NumberField
            label="Reuniones de liderazgo"
            name="leadership_meetings"
            register={register}
            error={errors.leadership_meetings?.message}
            disabled={disabled || saving}
          />
          <NumberField
            label="Reuniones de padres"
            name="parent_meetings"
            register={register}
            error={errors.parent_meetings?.message}
            disabled={disabled || saving}
          />
          <NumberField
            label="Eventos especiales"
            name="special_events"
            register={register}
            error={errors.special_events?.message}
            disabled={disabled || saving}
          />
          <div className="col-span-2 sm:col-span-4">
            <TextareaField
              label="Notas administrativas"
              name="administrative_notes"
              register={register}
              error={errors.administrative_notes?.message}
              disabled={disabled || saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actividad misionera */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actividad Misionera</CardTitle>
          <CardDescription>Estudios biblicos, almas y actividades de mision.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumberField
            label="Estudios biblicos"
            name="bible_studies_conducted"
            register={register}
            error={errors.bible_studies_conducted?.message}
            disabled={disabled || saving}
          />
          <NumberField
            label="Almas ganadas"
            name="souls_won"
            register={register}
            error={errors.souls_won?.message}
            disabled={disabled || saving}
          />
          <NumberField
            label="Eventos comunitarios"
            name="community_outreach_events"
            register={register}
            error={errors.community_outreach_events?.message}
            disabled={disabled || saving}
          />
          <NumberField
            label="Viajes misioneros"
            name="missionary_trips"
            register={register}
            error={errors.missionary_trips?.message}
            disabled={disabled || saving}
          />
          <div className="col-span-2 sm:col-span-4">
            <TextareaField
              label="Notas misioneras"
              name="missionary_notes"
              register={register}
              error={errors.missionary_notes?.message}
              disabled={disabled || saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Servicio */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Servicio</CardTitle>
          <CardDescription>Horas de servicio, proyectos y voluntarios.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumberField
            label="Horas de servicio"
            name="service_hours_total"
            register={register}
            error={errors.service_hours_total?.message}
            disabled={disabled || saving}
          />
          <NumberField
            label="Proyectos de servicio"
            name="service_projects"
            register={register}
            error={errors.service_projects?.message}
            disabled={disabled || saving}
          />
          <NumberField
            label="Voluntarios"
            name="volunteers_count"
            register={register}
            error={errors.volunteers_count?.message}
            disabled={disabled || saving}
          />
          <div className="col-span-2 sm:col-span-4">
            <TextareaField
              label="Notas de servicio"
              name="service_notes"
              register={register}
              error={errors.service_notes?.message}
              disabled={disabled || saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Observaciones generales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Observaciones Generales</CardTitle>
          <CardDescription>Desafios, logros y pedidos de oracion del mes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextareaField
            label="Desafios"
            name="challenges"
            register={register}
            error={errors.challenges?.message}
            disabled={disabled || saving}
          />
          <TextareaField
            label="Destacados del mes"
            name="highlights"
            register={register}
            error={errors.highlights?.message}
            disabled={disabled || saving}
          />
          <TextareaField
            label="Pedidos de oracion"
            name="prayer_requests"
            register={register}
            error={errors.prayer_requests?.message}
            disabled={disabled || saving}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || saving || !isDirty} size="sm">
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Guardar datos manuales
        </Button>
      </div>
    </form>
  );
}
