"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useForm, useWatch, type FieldErrors, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CatalogThumbnail } from "@/components/shared/catalog-thumbnail";
import {
  FormModalBody,
  FormModalFooter,
  FormModalSteps,
  useFormModal,
} from "@/components/shared/form-modal";
import { LocationPicker } from "@/components/shared/location-picker";
import { useFormSteps } from "@/components/shared/use-form-steps";
import { Segmented } from "@/components/shared/segmented";
import {
  createActivity,
  createActivitySeries,
  getCurrentEcclesiasticalYearFromClient,
  updateActivity,
} from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";
import { listClasses } from "@/lib/api/classes";
import type { ProgressiveClass } from "@/lib/api/classes";
import { useToastError } from "@/lib/feedback/toast-retry";
import { getFinanceSectionLabel, type FinanceClubSection } from "@/lib/finances/club-sections";
import {
  ACTIVITY_STEP_FIELDS,
  PLATFORM_HYBRID,
  PLATFORM_IN_PERSON,
  PLATFORM_VIRTUAL,
  buildActivityFormSchema,
  buildCreatePayload,
  buildSeriesPayload,
  buildUpdatePayload,
  defaultActivityFormValues,
  hasRealCoordinates,
  type ActivityFormValues,
  type ActivityValidationKey,
} from "@/lib/activities/form";
import {
  SERIES_MAX_OCCURRENCES,
  describeSeriesDates,
  expandSeriesDates,
  isOverSeriesCap,
  isoWeekdayOf,
} from "@/lib/activities/series-dates";

export interface ActivityFormProps {
  clubId: number;
  sections: FinanceClubSection[];
  defaultSectionId: number;
  /** Present when editing. */
  activity?: Activity | null;
  /** Where the list lives; used when the form is opened as a full page. */
  listHref: string;
  /** Today in the panel zone, `YYYY-MM-DD` (computed on the server). */
  today: string;
  googleMapsApiKey: string;
  googleMapsMapId?: string;
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const STEP_COUNT = ACTIVITY_STEP_FIELDS.length;

function stepOfField(field: string): number {
  const index = ACTIVITY_STEP_FIELDS.findIndex((fields) => (fields as readonly string[]).includes(field));
  return index === -1 ? 0 : index;
}

export function ActivityForm({
  clubId,
  sections,
  defaultSectionId,
  activity,
  listHref,
  today,
  googleMapsApiKey,
  googleMapsMapId,
}: ActivityFormProps) {
  const isEdit = Boolean(activity);
  const t = useTranslations("people.activities");
  const tOld = useTranslations("activities");
  const tSeries = useTranslations("activities.series");
  const tModal = useTranslations("shared.formModal");
  const locale = useLocale();
  const modal = useFormModal(listHref);
  const toastError = useToastError();
  const steps = useFormSteps(STEP_COUNT);
  const { step, direction, goTo, stepRef } = steps;

  const [submitting, setSubmitting] = useState(false);
  const [classOptions, setClassOptions] = useState<ProgressiveClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [yearEnd, setYearEnd] = useState("");
  const [mapVisited, setMapVisited] = useState(false);
  const weekdayTouched = useRef(false);
  const placeEdited = useRef(Boolean(activity?.activity_place));

  const schema = useMemo(
    () =>
      buildActivityFormSchema((key: ActivityValidationKey) => t(`validation.${key}`), {
        mode: isEdit ? "edit" : "create",
      }),
    [t, isEdit],
  );

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultActivityFormValues({ sectionId: defaultSectionId, today, activity }),
  });

  const [
    sectionId,
    audience,
    classIds,
    activityDate,
    repeat,
    repeatKind,
    weekday,
    intervalDays,
    until,
    platform,
    lat,
    long,
  ] = useWatch({
    control: form.control,
    name: [
      "club_section_id",
      "audience",
      "class_ids",
      "activity_date",
      "repeat",
      "repeat_kind",
      "weekday",
      "interval_days",
      "until",
      "platform",
      "lat",
      "long",
    ],
  });

  const section = sections.find((candidate) => candidate.club_section_id === sectionId) ?? sections[0];
  const clubTypeId = section?.club_type_id ?? activity?.club_type_id ?? 0;

  // The ecclesiastical year closes the series: it is the default "until" and the limit.
  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    void getCurrentEcclesiasticalYearFromClient()
      .then((year) => {
        if (cancelled) return;
        const end = (year.end_date ?? "").slice(0, 10);
        setYearEnd(end);
        if (end && !form.getValues("until")) form.setValue("until", end);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isEdit, form]);

  // Classes of the chosen section; all start checked (the audience is "who is left out").
  useEffect(() => {
    if (isEdit || audience !== "classes" || !clubTypeId) return;
    let cancelled = false;
    setClassesLoading(true);
    void listClasses({ clubTypeId, limit: 100 })
      .then((result) => {
        if (cancelled) return;
        const rows = [...(result.data ?? [])].sort((a, b) => a.display_order - b.display_order);
        setClassOptions(rows);
        form.setValue(
          "class_ids",
          rows.map((row) => row.class_id),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setClassOptions([]);
        form.setValue("class_ids", []);
        toast.error(tOld("audience.classesError"));
      })
      .finally(() => {
        if (!cancelled) setClassesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, audience, clubTypeId, form, tOld]);

  // The repeat day follows the first date until the person picks one.
  useEffect(() => {
    if (weekdayTouched.current || !activityDate) return;
    form.setValue("weekday", isoWeekdayOf(activityDate));
  }, [activityDate, form]);

  const seriesDates = useMemo(() => {
    if (isEdit || !repeat || !activityDate || !until) return [];
    return expandSeriesDates({
      start: activityDate,
      until,
      rule: repeatKind === "weekly" ? { kind: "weekly", weekday } : { kind: "interval", intervalDays },
    });
  }, [isEdit, repeat, activityDate, until, repeatKind, weekday, intervalDays]);
  const tooMany = isOverSeriesCap(seriesDates);

  const hasPin = hasRealCoordinates(lat, long);
  const showMap = mapVisited || step === STEP_COUNT - 1;
  useEffect(() => {
    if (step === STEP_COUNT - 1) setMapVisited(true);
  }, [step]);

  async function advance() {
    const valid = await form.trigger([...ACTIVITY_STEP_FIELDS[step]!] as never);
    if (valid) goTo(Math.min(step + 1, STEP_COUNT - 1));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter" || step >= STEP_COUNT - 1) return;
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement && target.type !== "button" && target.type !== "submit") {
      event.preventDefault();
      void advance();
    }
  }

  const onInvalid = (errors: FieldErrors<ActivityFormValues>) => {
    const first = Object.keys(errors)[0];
    if (first) goTo(stepOfField(first));
  };

  const onSubmit: SubmitHandler<ActivityFormValues> = async (values) => {
    setSubmitting(true);
    try {
      if (activity) {
        await updateActivity(activity.activity_id, buildUpdatePayload(values));
        toast.success(tOld("toasts.updated"));
      } else if (values.repeat) {
        const created = await createActivitySeries(clubId, buildSeriesPayload(values, clubTypeId));
        toast.success(tSeries("created", { count: created.created_count ?? seriesDates.length }));
      } else {
        await createActivity(clubId, buildCreatePayload(values, clubTypeId));
        toast.success(tOld("toasts.created"));
      }
      modal.complete();
    } catch (error: unknown) {
      toastError({
        title: tOld("errors.save_failed"),
        description: error instanceof Error && error.message ? error.message : undefined,
        onRetry: () => void form.handleSubmit(onSubmit, onInvalid)(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = [t("form.steps.what"), t("form.steps.when")];
  const typeOptions = [
    { value: 1, label: tOld("view.types.regular") },
    { value: 2, label: tOld("view.types.especial") },
    { value: 3, label: tOld("view.types.camporee") },
  ];
  const audienceOptions = [
    { value: "all" as const, label: tOld("audience.all") },
    { value: "board" as const, label: tOld("audience.board") },
    { value: "classes" as const, label: tOld("audience.classes") },
  ];
  const platformOptions = [
    { value: PLATFORM_IN_PERSON, label: t("modalities.inPerson") },
    { value: PLATFORM_VIRTUAL, label: t("modalities.virtual") },
    { value: PLATFORM_HYBRID, label: t("modalities.hybrid") },
  ];

  const submitLabel = isEdit
    ? tSeries("saveChanges")
    : repeat && seriesDates.length > 1
      ? tSeries("createMany", { count: seriesDates.length })
      : tSeries("createOne");
  const submitBlocked = submitting || (repeat && !isEdit && (seriesDates.length === 0 || tooMany));

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        onKeyDown={handleKeyDown}
        className="flex min-h-0 flex-1 flex-col"
      >
        <FormModalSteps steps={stepTitles} current={step} />

        <FormModalBody stepKey={step} direction={direction}>
          {/* Paso 1 · Qué y para quién */}
          <div ref={stepRef(0)} hidden={step !== 0} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={tOld("placeholders.name")} autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.description")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder={tOld("placeholders.description")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="club_section_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.section")}</FormLabel>
                    {isEdit || sections.length <= 1 ? (
                      <p className="flex h-9 items-center text-sm">
                        {section ? getFinanceSectionLabel(section) : "—"}
                      </p>
                    ) : (
                      <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={tOld("placeholders.selectSection")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sections.map((option) => (
                            <SelectItem key={option.club_section_id} value={String(option.club_section_id)}>
                              {getFinanceSectionLabel(option)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activity_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel id="activity-type-label">{t("form.type")}</FormLabel>
                    <Segmented
                      labelledBy="activity-type-label"
                      options={typeOptions}
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEdit ? (
              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel id="activity-audience-label">{tOld("audience.label")}</FormLabel>
                    <Segmented
                      labelledBy="activity-audience-label"
                      options={audienceOptions}
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      {field.value === "all"
                        ? tOld("audience.allHelp")
                        : field.value === "board"
                          ? tOld("audience.boardHelp")
                          : tOld("audience.classesHelp")}
                    </p>
                    {field.value === "classes" ? (
                      <fieldset className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3" disabled={classesLoading}>
                        <legend className="sr-only">{tOld("audience.classes")}</legend>
                        {classesLoading ? (
                          <p className="col-span-full text-sm text-muted-foreground">{t("form.classesLoading")}</p>
                        ) : classOptions.length === 0 ? (
                          <p className="col-span-full text-sm text-muted-foreground">{tOld("audience.classesEmpty")}</p>
                        ) : (
                          classOptions.map((item) => {
                            const checked = classIds.includes(item.class_id);
                            const id = `activity-class-${item.class_id}`;
                            return (
                              <div key={item.class_id} className="flex items-center gap-2 rounded-md border px-2 py-2">
                                <Checkbox
                                  id={id}
                                  checked={checked}
                                  onCheckedChange={(next) =>
                                    form.setValue(
                                      "class_ids",
                                      next === true
                                        ? [...classIds, item.class_id]
                                        : classIds.filter((classId) => classId !== item.class_id),
                                      { shouldValidate: true },
                                    )
                                  }
                                />
                                {item.asset_code ? (
                                  <CatalogThumbnail
                                    src={`/img/logos-clases/${item.asset_code}.png`}
                                    size={28}
                                    fallback={null}
                                  />
                                ) : null}
                                <Label htmlFor={id} className="text-sm font-normal">
                                  {item.name}
                                </Label>
                              </div>
                            );
                          })
                        )}
                      </fieldset>
                    ) : null}
                  </FormItem>
                )}
              />
            ) : null}
            {!isEdit ? (
              <FormField
                control={form.control}
                name="class_ids"
                render={() => (
                  <FormItem className="-mt-2">
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.image")}</FormLabel>
                  <FormControl>
                    <Input type="url" inputMode="url" placeholder={tOld("placeholders.externalUrl")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Paso 2 · Fecha y lugar */}
          <div ref={stepRef(1)} hidden={step !== 1} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="activity_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{repeat ? tSeries("firstDate") : tSeries("sessionDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" min={isEdit ? undefined : today} max={yearEnd || undefined} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="activity_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.time")}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!repeat ? (
              <FormField
                control={form.control}
                name="activity_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tSeries("endDate")}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="sm:max-w-[calc(50%-0.5rem)]"
                        min={activityDate || today}
                        max={yearEnd || undefined}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {!isEdit ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="activity-repeat">{tSeries("toggle")}</Label>
                    <p className="text-xs text-muted-foreground">{tSeries("toggleHelp")}</p>
                  </div>
                  <Switch
                    id="activity-repeat"
                    checked={repeat}
                    onCheckedChange={(checked) => {
                      form.setValue("repeat", checked);
                      if (checked) form.setValue("activity_end_date", "");
                    }}
                  />
                </div>

                {repeat ? (
                  <div className="space-y-3">
                    <Segmented
                      label={tSeries("toggle")}
                      options={[
                        { value: "weekly" as const, label: tSeries("kindWeekly") },
                        { value: "interval" as const, label: tSeries("kindInterval") },
                      ]}
                      value={repeatKind}
                      onChange={(value) => form.setValue("repeat_kind", value)}
                    />

                    <div className="flex flex-wrap items-start gap-4">
                      {repeatKind === "weekly" ? (
                        <div className="space-y-1.5">
                          <Label id="activity-weekday-label">{tSeries("weekday")}</Label>
                          <Segmented
                            size="sm"
                            labelledBy="activity-weekday-label"
                            options={WEEKDAYS.map((day) => ({ value: day, label: tSeries(`weekdaysShort.${day}`) }))}
                            value={weekday}
                            onChange={(value) => {
                              weekdayTouched.current = true;
                              form.setValue("weekday", value);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <Label htmlFor="activity-interval">{tSeries("everyDays")}</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              aria-label={tSeries("intervalDecrease")}
                              disabled={intervalDays <= 1}
                              onClick={() => form.setValue("interval_days", Math.max(1, intervalDays - 1))}
                            >
                              <Minus className="size-3.5" />
                            </Button>
                            <Input
                              id="activity-interval"
                              type="number"
                              min={1}
                              max={365}
                              className="w-20 text-center tabular-nums"
                              value={intervalDays}
                              onChange={(event) =>
                                form.setValue("interval_days", Math.min(365, Math.max(1, Number(event.target.value) || 1)))
                              }
                            />
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              aria-label={tSeries("intervalIncrease")}
                              disabled={intervalDays >= 365}
                              onClick={() => form.setValue("interval_days", Math.min(365, intervalDays + 1))}
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="until"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{tSeries("until")}</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                min={activityDate || today}
                                max={yearEnd || undefined}
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <p
                      role="status"
                      className={tooMany ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
                    >
                      {tooMany
                        ? t("form.seriesTooMany", { max: SERIES_MAX_OCCURRENCES })
                        : seriesDates.length === 0
                          ? t("form.seriesNone")
                          : t("form.seriesDates", {
                              count: seriesDates.length,
                              dates: describeSeriesDates(seriesDates, locale),
                            })}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel id="activity-modality-label">{t("form.modality")}</FormLabel>
                  <Segmented
                    labelledBy="activity-modality-label"
                    options={platformOptions}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {platform !== PLATFORM_IN_PERSON ? (
              <FormField
                control={form.control}
                name="link_meet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{platform === PLATFORM_VIRTUAL ? t("form.link") : t("form.linkOptional")}</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        inputMode="url"
                        placeholder={tOld("placeholders.meetUrl")}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {platform !== PLATFORM_VIRTUAL ? (
              <div className="space-y-3">
                {showMap ? (
                  <LocationPicker
                    apiKey={googleMapsApiKey}
                    mapsMapId={googleMapsMapId}
                    initialLat={activity && hasRealCoordinates(activity.lat, activity.long) ? activity.lat : null}
                    initialLng={activity && hasRealCoordinates(activity.lat, activity.long) ? activity.long : null}
                    initialAddress={activity?.activity_place ?? null}
                    onLocationChange={(value) => {
                      form.setValue("lat", value?.lat ?? 0, { shouldValidate: form.formState.isSubmitted });
                      form.setValue("long", value?.lng ?? 0);
                      if (value?.address && (!placeEdited.current || !form.getValues("activity_place"))) {
                        form.setValue("activity_place", value.address, { shouldValidate: form.formState.isSubmitted });
                        placeEdited.current = false;
                      }
                    }}
                  />
                ) : null}
                {form.formState.errors.lat?.message ? (
                  <p role="alert" className="text-xs text-destructive">
                    {form.formState.errors.lat.message}
                  </p>
                ) : null}
                <FormField
                  control={form.control}
                  name="activity_place"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.place")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={tOld("placeholders.location")}
                          autoComplete="off"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => {
                            placeEdited.current = true;
                            field.onChange(event);
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {hasPin ? t("form.placeHintPinned") : t("form.placeHint")}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}
          </div>
        </FormModalBody>

        <FormModalFooter step={step} total={STEP_COUNT}>
          {step === 0 ? (
            <Button type="button" variant="outline" onClick={modal.close} disabled={submitting}>
              {t("form.cancel")}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => goTo(step - 1)} disabled={submitting}>
              {tModal("back")}
            </Button>
          )}
          {step < STEP_COUNT - 1 ? (
            <Button type="button" onClick={() => void advance()}>
              {tModal("continue")}
            </Button>
          ) : (
            <Button type="submit" loading={submitting} disabled={submitBlocked}>
              {submitLabel}
            </Button>
          )}
        </FormModalFooter>
      </form>
    </Form>
  );
}
