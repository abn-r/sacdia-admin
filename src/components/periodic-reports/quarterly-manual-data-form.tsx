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
  updateQuarterlyReportManualData,
  type AdminQuarterlyReport,
  type QuarterlyManualData,
} from "@/lib/api/reports";

const TEXT_MAX = 4000;

type FormValues = {
  planning_meetings: string;
  parent_meetings: string;
  youth_council_attendance: string;
  church_board_attendance: string;
  soul_target: string;
  baptized_this_quarter: string;
  camporees_attended: string;
  club_participation_description: string;
  community_service_description: string;
  certificates_delivered: boolean;
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
    youth_council_attendance: whole,
    church_board_attendance: whole,
    soul_target: whole,
    baptized_this_quarter: whole,
    camporees_attended: whole,
    club_participation_description: text,
    community_service_description: text,
    certificates_delivered: z.boolean(),
  });
}

function toFormValues(data: QuarterlyManualData | null | undefined): FormValues {
  const num = (value: number | null | undefined) => (value == null ? "" : String(value));
  return {
    planning_meetings: num(data?.planning_meetings),
    parent_meetings: num(data?.parent_meetings),
    youth_council_attendance: num(data?.youth_council_attendance),
    church_board_attendance: num(data?.church_board_attendance),
    soul_target: num(data?.soul_target),
    baptized_this_quarter: num(data?.baptized_this_quarter),
    camporees_attended: num(data?.camporees_attended),
    club_participation_description: data?.club_participation_description ?? "",
    community_service_description: data?.community_service_description ?? "",
    certificates_delivered: Boolean(data?.certificates_delivered),
  };
}

/** Blank numbers stay out of the PATCH (the backend merges); texts can be cleared. */
export function buildQuarterlyManualPayload(
  values: FormValues,
  initial: QuarterlyManualData | null | undefined,
): QuarterlyManualData {
  const payload: QuarterlyManualData = {
    certificates_delivered: values.certificates_delivered,
  };
  const numbers = [
    "planning_meetings",
    "parent_meetings",
    "youth_council_attendance",
    "church_board_attendance",
    "soul_target",
    "baptized_this_quarter",
    "camporees_attended",
  ] as const;
  for (const key of numbers) {
    const parsed = parseOptionalInt(values[key]);
    if (parsed !== undefined) payload[key] = parsed;
  }
  const texts = ["club_participation_description", "community_service_description"] as const;
  for (const key of texts) {
    const value = values[key].trim();
    if (value !== "" || (initial?.[key] ?? "") !== "") payload[key] = value;
  }
  return payload;
}

interface QuarterlyManualDataFormProps {
  reportId: number;
  initialData?: QuarterlyManualData | null;
  onSaved: (report: AdminQuarterlyReport) => void;
}

export function QuarterlyManualDataForm({
  reportId,
  initialData,
  onSaved,
}: QuarterlyManualDataFormProps) {
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
      const updated = await updateQuarterlyReportManualData(
        reportId,
        buildQuarterlyManualPayload(values, initialData),
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
            <CardTitle className="text-base">{t("quarterly.manual.sectionMeetings")}</CardTitle>
            <CardDescription>{t("quarterly.manual.sectionMeetingsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ManualNumberField control={control} name="planning_meetings" label={t("quarterly.manual.planningMeetings")} />
            <ManualNumberField control={control} name="parent_meetings" label={t("quarterly.manual.parentMeetings")} />
            <ManualNumberField control={control} name="youth_council_attendance" label={t("quarterly.manual.youthCouncilAttendance")} />
            <ManualNumberField control={control} name="church_board_attendance" label={t("quarterly.manual.churchBoardAttendance")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("quarterly.manual.sectionMissionary")}</CardTitle>
            <CardDescription>{t("quarterly.manual.sectionMissionaryDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ManualNumberField control={control} name="soul_target" label={t("quarterly.manual.soulTarget")} />
            <ManualNumberField control={control} name="baptized_this_quarter" label={t("quarterly.manual.baptizedThisQuarter")} />
            <ManualNumberField control={control} name="camporees_attended" label={t("quarterly.manual.camporeesAttended")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("quarterly.manual.sectionNarrative")}</CardTitle>
            <CardDescription>{t("quarterly.manual.sectionNarrativeDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ManualTextareaField control={control} name="club_participation_description" label={t("quarterly.manual.clubParticipation")} />
            <ManualTextareaField control={control} name="community_service_description" label={t("quarterly.manual.communityService")} />
            <ManualSwitchField control={control} name="certificates_delivered" label={t("quarterly.manual.certificatesDelivered")} />
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
