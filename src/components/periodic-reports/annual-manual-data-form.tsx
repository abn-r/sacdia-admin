"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ManualNumberField,
  ManualSwitchField,
  ManualTextareaField,
  WHOLE_NUMBER_PATTERN,
  parseOptionalInt,
} from "@/components/periodic-reports/manual-data-fields";
import {
  updateAnnualReportManualData,
  type AdminAnnualReport,
  type AnnualManualData,
} from "@/lib/api/reports";

const TEXT_MAX = 6000;

type FormValues = {
  planning_meetings: string;
  parent_meetings: string;
  baptized_this_year: string;
  total_baptized: string;
  camporees_attended: string;
  annual_achievements_description: string;
  community_service_description: string;
  all_investitures_completed: boolean;
};

function buildSchema(messages: { wholeNumber: string; textTooLong: string }) {
  const whole = z
    .string()
    .refine((value) => value.trim() === "" || WHOLE_NUMBER_PATTERN.test(value.trim()), {
      message: messages.wholeNumber,
    });
  const text = z.string().max(TEXT_MAX, { message: messages.textTooLong });

  return z.object({
    planning_meetings: whole,
    parent_meetings: whole,
    baptized_this_year: whole,
    total_baptized: whole,
    camporees_attended: whole,
    annual_achievements_description: text,
    community_service_description: text,
    all_investitures_completed: z.boolean(),
  });
}

function toFormValues(data: AnnualManualData | null | undefined): FormValues {
  const num = (value: number | null | undefined) => (value == null ? "" : String(value));
  return {
    planning_meetings: num(data?.planning_meetings),
    parent_meetings: num(data?.parent_meetings),
    baptized_this_year: num(data?.baptized_this_year),
    total_baptized: num(data?.total_baptized),
    camporees_attended: num(data?.camporees_attended),
    annual_achievements_description: data?.annual_achievements_description ?? "",
    community_service_description: data?.community_service_description ?? "",
    all_investitures_completed: Boolean(data?.all_investitures_completed),
  };
}

/** Blank numbers stay out of the PATCH (the backend merges); texts can be cleared. */
export function buildAnnualManualPayload(
  values: FormValues,
  initial: AnnualManualData | null | undefined,
): AnnualManualData {
  const payload: AnnualManualData = {
    all_investitures_completed: values.all_investitures_completed,
  };
  const numbers = [
    "planning_meetings",
    "parent_meetings",
    "baptized_this_year",
    "total_baptized",
    "camporees_attended",
  ] as const;
  for (const key of numbers) {
    const parsed = parseOptionalInt(values[key]);
    if (parsed !== undefined) payload[key] = parsed;
  }
  const texts = ["annual_achievements_description", "community_service_description"] as const;
  for (const key of texts) {
    const value = values[key].trim();
    if (value !== "" || (initial?.[key] ?? "") !== "") payload[key] = value;
  }
  return payload;
}

interface AnnualManualDataFormProps {
  reportId: number;
  initialData?: AnnualManualData | null;
  onSaved: (report: AdminAnnualReport) => void;
}

export function AnnualManualDataForm({
  reportId,
  initialData,
  onSaved,
}: AnnualManualDataFormProps) {
  const t = useTranslations("periodicReports");
  const [saving, setSaving] = useState(false);

  const schema = useMemo(
    () =>
      buildSchema({
        wholeNumber: t("common.manual.errorWholeNumber"),
        textTooLong: t("common.manual.errorTextTooLong", { max: TEXT_MAX }),
      }),
    [t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(initialData),
  });
  const { control } = form;

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const updated = await updateAnnualReportManualData(
        reportId,
        buildAnnualManualPayload(values, initialData),
      );
      toast.success(t("common.toasts.manualSaved"));
      form.reset(values);
      onSaved(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.errors.saveManual"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("annual.manual.sectionMeetings")}</CardTitle>
            <CardDescription>{t("annual.manual.sectionMeetingsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ManualNumberField control={control} name="planning_meetings" label={t("annual.manual.planningMeetings")} />
            <ManualNumberField control={control} name="parent_meetings" label={t("annual.manual.parentMeetings")} />
            <ManualNumberField control={control} name="camporees_attended" label={t("annual.manual.camporeesAttended")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("annual.manual.sectionMissionary")}</CardTitle>
            <CardDescription>{t("annual.manual.sectionMissionaryDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ManualNumberField control={control} name="baptized_this_year" label={t("annual.manual.baptizedThisYear")} />
            <ManualNumberField control={control} name="total_baptized" label={t("annual.manual.totalBaptized")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("annual.manual.sectionNarrative")}</CardTitle>
            <CardDescription>{t("annual.manual.sectionNarrativeDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ManualTextareaField control={control} name="annual_achievements_description" label={t("annual.manual.achievements")} />
            <ManualTextareaField control={control} name="community_service_description" label={t("annual.manual.communityService")} />
            <ManualSwitchField control={control} name="all_investitures_completed" label={t("annual.manual.allInvestituresCompleted")} />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={!form.formState.isDirty}>
            <Save className="size-4" />
            {t("common.manual.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
