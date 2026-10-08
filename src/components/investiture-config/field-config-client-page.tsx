"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarRange, Info, Loader2, MapPin } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { PageHeader } from "@/components/shared/page-header";
import {
  EcclesiasticalYearSelect,
  type EcclesiasticalYear,
} from "@/components/shared/selectors/ecclesiastical-year-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatCivilDate } from "@/components/investiture-requests/format-date";
import { getInvestitureRequestErrorMessage } from "@/components/investiture-requests/investiture-request-errors";
import {
  updateFieldClassThreshold,
  updateInvestitureWindow,
  type FieldClassThreshold,
  type InvestitureWindow,
} from "@/lib/api/investiture-field-config";

const SETTINGS_PATH = "/dashboard/investiture-settings";
const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface FieldConfigLoadError {
  status: number | null;
  message: string;
}

export interface FieldConfigClientPageProps {
  /** Local field being configured; null until a picker-capable role chooses one. */
  localFieldId: number | null;
  /** Year being configured; null when the catalog has no usable year. */
  yearId: number | null;
  years: EcclesiasticalYear[];
  window: InvestitureWindow | null;
  threshold: FieldClassThreshold | null;
  windowError: FieldConfigLoadError | null;
  thresholdError: FieldConfigLoadError | null;
  /** Server-rendered local-field picker for union, division and admin roles. */
  localFieldPicker?: ReactNode;
}

function civilPart(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  return CIVIL_DATE.test(day) ? day : null;
}

export function FieldConfigClientPage({
  localFieldId,
  yearId,
  years,
  window: windowView,
  threshold,
  windowError,
  thresholdError,
  localFieldPicker,
}: FieldConfigClientPageProps) {
  const t = useTranslations("investiture_config.settings");
  const router = useRouter();

  const year = years.find((item) => item.ecclesiastical_year_id === yearId) ?? null;

  function handleYearChange(nextYearId: number | null) {
    if (nextYearId === null || nextYearId === yearId) return;
    const params = new URLSearchParams();
    if (localFieldId !== null) params.set("local_field_id", String(localFieldId));
    params.set("year", String(nextYearId));
    router.push(`${SETTINGS_PATH}?${params.toString()}`);
  }

  const canConfigure = localFieldId !== null && yearId !== null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("breadcrumbHome"), href: "/dashboard" },
          { label: t("breadcrumbGroup") },
          { label: t("title") },
        ]}
        actions={
          <div className="w-56">
            <EcclesiasticalYearSelect
              value={yearId}
              onChange={handleYearChange}
              years={years}
              activeOnly={false}
              placeholder={t("yearPlaceholder")}
            />
          </div>
        }
      />

      {localFieldPicker}

      {localFieldId === null && (
        <EmptyState
          icon={MapPin}
          title={t("selectLocalFieldTitle")}
          description={t("selectLocalFieldDescription")}
        />
      )}

      {localFieldId !== null && yearId === null && (
        <EmptyState
          icon={CalendarRange}
          title={t("noYearTitle")}
          description={t("noYearDescription")}
        />
      )}

      {canConfigure && (
        <>
          {windowError ? (
            <EndpointErrorBanner
              state={windowError.status === 403 ? "forbidden" : "missing"}
              detail={windowError.message}
            />
          ) : (
            windowView && (
              <WindowCard
                // A different Field or year is a different record: restart the form.
                key={`window-${localFieldId}-${yearId}`}
                localFieldId={localFieldId}
                yearId={yearId}
                window={windowView}
                yearStart={civilPart(year?.start_date)}
                yearEnd={civilPart(year?.end_date)}
              />
            )
          )}

          {thresholdError ? (
            thresholdError.status === 403 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("threshold.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Info aria-hidden="true" />
                    <AlertDescription>{t("threshold.restricted")}</AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <EndpointErrorBanner state="missing" detail={thresholdError.message} />
            )
          ) : (
            threshold && (
              <ThresholdCard
                key={`threshold-${localFieldId}-${yearId}`}
                localFieldId={localFieldId}
                yearId={yearId}
                threshold={threshold}
              />
            )
          )}
        </>
      )}
    </div>
  );
}

// ─── Window ──────────────────────────────────────────────────────────────────

type WindowFormValues = { start_date: string; end_date: string };

interface WindowCardProps {
  localFieldId: number;
  yearId: number;
  window: InvestitureWindow;
  yearStart: string | null;
  yearEnd: string | null;
}

function WindowCard({ localFieldId, yearId, window: initial, yearStart, yearEnd }: WindowCardProps) {
  const t = useTranslations("investiture_config.settings.window");
  const tRoot = useTranslations("investiture_requests");
  const locale = useLocale();
  const router = useRouter();

  const [saved, setSaved] = useState<InvestitureWindow | null>(null);
  const view = saved ?? initial;

  const schema = useMemo(
    () =>
      z
        .object({
          start_date: z.string().regex(CIVIL_DATE, t("required")),
          end_date: z.string().regex(CIVIL_DATE, t("required")),
        })
        .superRefine((value, ctx) => {
          if (!CIVIL_DATE.test(value.start_date) || !CIVIL_DATE.test(value.end_date)) return;
          for (const field of ["start_date", "end_date"] as const) {
            const day = value[field];
            if ((yearStart && day < yearStart) || (yearEnd && day > yearEnd)) {
              ctx.addIssue({
                code: "custom",
                path: [field],
                message: t("outsideYear", { start: yearStart ?? "", end: yearEnd ?? "" }),
              });
            }
          }
          if (value.start_date > value.end_date) {
            ctx.addIssue({ code: "custom", path: ["start_date"], message: t("startAfterEnd") });
          }
        }),
    [t, yearStart, yearEnd],
  );

  const form = useForm<WindowFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      start_date: civilPart(view.start_date) ?? "",
      end_date: civilPart(view.end_date) ?? "",
    },
  });

  const missingDates = !view.start_date || !view.end_date;
  const isSubmitting = form.formState.isSubmitting;

  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await updateInvestitureWindow(localFieldId, yearId, values);
      setSaved(result);
      form.reset({
        start_date: civilPart(result.start_date) ?? values.start_date,
        end_date: civilPart(result.end_date) ?? values.end_date,
      });
      toast.success(t("saved"));
      router.refresh();
    } catch (error) {
      toast.error(getInvestitureRequestErrorMessage(error, tRoot));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={submit} noValidate>
          <CardContent className="space-y-4">
            {missingDates ? (
              <p className="text-sm text-warning-foreground dark:text-warning">
                {t("notOperational")}
              </p>
            ) : (
              <p className="text-sm text-foreground">
                {t("range", {
                  start: formatCivilDate(view.start_date, locale) ?? "",
                  end: formatCivilDate(view.end_date, locale) ?? "",
                })}
              </p>
            )}

            {!view.configured && !missingDates && (
              <p className="text-sm text-muted-foreground">{t("defaultNotice")}</p>
            )}

            {view.can_edit ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("startLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          min={yearStart ?? undefined}
                          max={yearEnd ?? undefined}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("endLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          min={yearStart ?? undefined}
                          max={yearEnd ?? undefined}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
            )}
          </CardContent>
          {view.can_edit && (
            <CardFooter className="justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                {isSubmitting ? t("saving") : t("save")}
              </Button>
            </CardFooter>
          )}
        </form>
      </Form>
    </Card>
  );
}

// ─── Threshold ───────────────────────────────────────────────────────────────

type ThresholdFormValues = { minimum_percent: string };

interface ThresholdCardProps {
  localFieldId: number;
  yearId: number;
  threshold: FieldClassThreshold;
}

function ThresholdCard({ localFieldId, yearId, threshold: initial }: ThresholdCardProps) {
  const t = useTranslations("investiture_config.settings.threshold");
  const tRoot = useTranslations("investiture_requests");
  const router = useRouter();

  const [saved, setSaved] = useState<FieldClassThreshold | null>(null);
  const view = saved ?? initial;

  const schema = useMemo(
    () =>
      z.object({
        minimum_percent: z
          .string()
          .trim()
          .regex(/^\d{1,3}$/, t("invalid"))
          .refine((value) => Number(value) <= 100, t("invalid")),
      }),
    [t],
  );

  const form = useForm<ThresholdFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { minimum_percent: String(view.minimum_percent) },
  });

  const isSubmitting = form.formState.isSubmitting;

  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await updateFieldClassThreshold(
        localFieldId,
        yearId,
        Number(values.minimum_percent),
      );
      setSaved(result);
      form.reset({ minimum_percent: String(result.minimum_percent) });
      toast.success(t("saved"));
      router.refresh();
    } catch (error) {
      toast.error(getInvestitureRequestErrorMessage(error, tRoot));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={submit} noValidate>
          <CardContent className="space-y-4">
            {view.can_edit ? (
              <FormField
                control={form.control}
                name="minimum_percent"
                render={({ field }) => (
                  <FormItem className="max-w-48">
                    <FormLabel>{t("label")}</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" min={0} max={100} step={1} {...field} />
                    </FormControl>
                    <FormDescription>{t("help")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <>
                <p className="text-sm text-foreground">
                  {t("current", { percent: view.minimum_percent })}
                </p>
                <p className="text-sm text-muted-foreground">{t("help")}</p>
                <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
              </>
            )}

            {!view.configured && <p className="text-sm text-muted-foreground">{t("defaultNotice")}</p>}
          </CardContent>
          {view.can_edit && (
            <CardFooter className="justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                {isSubmitting ? t("saving") : t("save")}
              </Button>
            </CardFooter>
          )}
        </form>
      </Form>
    </Card>
  );
}
