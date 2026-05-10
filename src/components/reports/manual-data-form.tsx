"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { Control, FieldPath, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  name: FieldPath<FormValues>;
  control: Control<FormValues>;
  disabled?: boolean;
}

function NumberField({ label, name, control, disabled }: NumberFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="text-sm font-medium">{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              disabled={disabled}
              className="h-8"
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface TextareaFieldProps {
  label: string;
  name: FieldPath<FormValues>;
  control: Control<FormValues>;
  disabled?: boolean;
  rows?: number;
}

function TextareaField({ label, name, control, disabled, rows = 3 }: TextareaFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="text-sm font-medium">{label}</FormLabel>
          <FormControl>
            <Textarea
              rows={rows}
              disabled={disabled}
              className="resize-none text-sm"
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManualDataForm({
  reportId,
  initialData,
  disabled = false,
  onSuccess,
}: ManualDataFormProps) {
  const t = useTranslations("reports");
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(manualDataSchema as z.ZodType<FormValues, FormValues>),
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
      toast.success(t("toasts.manual_data_saved"));
      onSuccess?.(updated.manual_data ?? payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("errors.save_manual_data");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = form.formState.isDirty;
  const control = form.control;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Administración */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("manualData.sectionAdmin")}</CardTitle>
            <CardDescription>{t("manualData.sectionAdminDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumberField
              label={t("manualData.fieldWeeklyMeetings")}
              name="weekly_meetings_held"
              control={control}
              disabled={disabled || saving}
            />
            <NumberField
              label={t("manualData.fieldLeadershipMeetings")}
              name="leadership_meetings"
              control={control}
              disabled={disabled || saving}
            />
            <NumberField
              label={t("manualData.fieldParentMeetings")}
              name="parent_meetings"
              control={control}
              disabled={disabled || saving}
            />
            <NumberField
              label={t("manualData.fieldSpecialEvents")}
              name="special_events"
              control={control}
              disabled={disabled || saving}
            />
            <div className="col-span-2 sm:col-span-4">
              <TextareaField
                label={t("manualData.fieldAdminNotes")}
                name="administrative_notes"
                control={control}
                disabled={disabled || saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actividad misionera */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("manualData.sectionMissionary")}</CardTitle>
            <CardDescription>{t("manualData.sectionMissionaryDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumberField
              label={t("manualData.fieldBibleStudies")}
              name="bible_studies_conducted"
              control={control}
              disabled={disabled || saving}
            />
            <NumberField
              label={t("manualData.fieldSoulsWon")}
              name="souls_won"
              control={control}
              disabled={disabled || saving}
            />
            <NumberField
              label={t("manualData.fieldCommunityEvents")}
              name="community_outreach_events"
              control={control}
              disabled={disabled || saving}
            />
            <NumberField
              label={t("manualData.fieldMissionaryTrips")}
              name="missionary_trips"
              control={control}
              disabled={disabled || saving}
            />
            <div className="col-span-2 sm:col-span-4">
              <TextareaField
                label={t("manualData.fieldMissionaryNotes")}
                name="missionary_notes"
                control={control}
                disabled={disabled || saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Servicio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("manualData.sectionService")}</CardTitle>
            <CardDescription>{t("manualData.sectionServiceDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumberField
              label={t("manualData.fieldServiceHours")}
              name="service_hours_total"
              control={control}
              disabled={disabled || saving}
            />
            <NumberField
              label={t("manualData.fieldServiceProjects")}
              name="service_projects"
              control={control}
              disabled={disabled || saving}
            />
            <NumberField
              label={t("manualData.fieldVolunteers")}
              name="volunteers_count"
              control={control}
              disabled={disabled || saving}
            />
            <div className="col-span-2 sm:col-span-4">
              <TextareaField
                label={t("manualData.fieldServiceNotes")}
                name="service_notes"
                control={control}
                disabled={disabled || saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Observaciones generales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("manualData.sectionGeneral")}</CardTitle>
            <CardDescription>{t("manualData.sectionGeneralDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextareaField
              label={t("manualData.fieldChallenges")}
              name="challenges"
              control={control}
              disabled={disabled || saving}
            />
            <TextareaField
              label={t("manualData.fieldHighlights")}
              name="highlights"
              control={control}
              disabled={disabled || saving}
            />
            <TextareaField
              label={t("manualData.fieldPrayerRequests")}
              name="prayer_requests"
              control={control}
              disabled={disabled || saving}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={disabled || saving || !isDirty} size="sm">
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {t("manualData.saveButton")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
