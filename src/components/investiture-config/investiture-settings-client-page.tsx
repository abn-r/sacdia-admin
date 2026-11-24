"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarRange, Landmark, MapPin, UserPlus } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { PageHeader } from "@/components/shared/page-header";
import {
  EcclesiasticalYearSelect,
  type EcclesiasticalYear,
} from "@/components/shared/selectors/ecclesiastical-year-select";
import {
  SettingsRow,
  SettingsSaveBar,
  SettingsSection,
} from "@/components/shared/settings-rows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCivilDate } from "@/components/investiture-requests/format-date";
import { getInvestitureRequestErrorMessage } from "@/components/investiture-requests/investiture-request-errors";
import {
  removeDistrictPastor,
  updateInvestitureWindow,
  updatePastorQuota,
  type DistrictPastor,
  type DistrictPastorList,
  type InvestitureWindow,
  type PastorQuota,
} from "@/lib/api/investiture-field-config";
import { AssignPastorDialog } from "./assign-pastor-dialog";

export const INVESTITURE_SETTINGS_PATH = "/dashboard/configuration/investiture";
const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface SettingsLoadError {
  status: number | null;
  message: string;
}

/** One district of the Field with the outcome of loading its pastors. */
export interface DistrictPastorsEntry {
  districtId: number;
  name: string;
  list: DistrictPastorList | null;
  error: SettingsLoadError | null;
}

export interface InvestitureSettingsClientPageProps {
  /** Local field being configured; null until a picker-capable role chooses one. */
  localFieldId: number | null;
  /** Year being configured; null when the catalog has no usable year. */
  yearId: number | null;
  years: EcclesiasticalYear[];
  window: InvestitureWindow | null;
  windowError: SettingsLoadError | null;
  districts: DistrictPastorsEntry[];
  districtsError: SettingsLoadError | null;
  quota: PastorQuota | null;
  quotaError: SettingsLoadError | null;
  /** Server-rendered local-field picker for union, division and admin roles. */
  localFieldPicker?: ReactNode;
}

function civilPart(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  return CIVIL_DATE.test(day) ? day : null;
}

function pastorLabel(pastor: DistrictPastor, fallback: string): string {
  return pastor.user_name?.trim() || pastor.email || fallback;
}

function errorKind(error: SettingsLoadError): "forbidden" | "error" {
  return error.status === 403 ? "forbidden" : "error";
}

export function InvestitureSettingsClientPage({
  localFieldId,
  yearId,
  years,
  window: windowView,
  windowError,
  districts,
  districtsError,
  quota,
  quotaError,
  localFieldPicker,
}: InvestitureSettingsClientPageProps) {
  const t = useTranslations("queues.investitures.settings");
  const tYear = useTranslations("investiture_config.settings");
  const router = useRouter();
  const year = years.find((item) => item.ecclesiastical_year_id === yearId) ?? null;

  function handleYearChange(nextYearId: number | null) {
    if (nextYearId === null || nextYearId === yearId) return;
    const params = new URLSearchParams();
    if (localFieldId !== null) params.set("local_field_id", String(localFieldId));
    params.set("year", String(nextYearId));
    router.push(`${INVESTITURE_SETTINGS_PATH}?${params.toString()}`);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: t("breadcrumbGroup"), href: "/dashboard/configuration" },
          { label: t("title") },
        ]}
        actions={
          <div className="w-56">
            <EcclesiasticalYearSelect
              value={yearId}
              onChange={handleYearChange}
              years={years}
              activeOnly={false}
              placeholder={tYear("yearPlaceholder")}
            />
          </div>
        }
      />

      {localFieldPicker}

      {localFieldId === null ? (
        <EmptyState
          icon={MapPin}
          title={t("selectField.title")}
          description={t("selectField.description")}
        />
      ) : (
        <div>
          <WindowSection
            // A different Field or year is a different record: restart the form.
            key={`window-${localFieldId}-${yearId}`}
            localFieldId={localFieldId}
            yearId={yearId}
            window={windowView}
            error={windowError}
            yearStart={civilPart(year?.start_date)}
            yearEnd={civilPart(year?.end_date)}
          />
          <PastorsSection
            districts={districts}
            districtsError={districtsError}
            quota={quota}
            quotaError={quotaError}
          />
        </div>
      )}
    </div>
  );
}

// ─── Window ──────────────────────────────────────────────────────────────────

type WindowFormValues = { start_date: string; end_date: string };

interface WindowSectionProps {
  localFieldId: number;
  yearId: number | null;
  window: InvestitureWindow | null;
  error: SettingsLoadError | null;
  yearStart: string | null;
  yearEnd: string | null;
}

function WindowSection({
  localFieldId,
  yearId,
  window: initial,
  error,
  yearStart,
  yearEnd,
}: WindowSectionProps) {
  const t = useTranslations("investiture_config.settings.window");
  const tSettings = useTranslations("investiture_config.settings");
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
      start_date: civilPart(view?.start_date) ?? "",
      end_date: civilPart(view?.end_date) ?? "",
    },
  });
  const { errors, isDirty, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    if (yearId === null) return;
    try {
      const result = await updateInvestitureWindow(localFieldId, yearId, values);
      setSaved(result);
      form.reset({
        start_date: civilPart(result.start_date) ?? values.start_date,
        end_date: civilPart(result.end_date) ?? values.end_date,
      });
      toast.success(t("saved"));
      router.refresh();
    } catch (err) {
      toast.error(getInvestitureRequestErrorMessage(err, tRoot));
    }
  });

  let body: ReactNode;
  if (yearId === null) {
    body = (
      <EmptyState
        icon={CalendarRange}
        title={tSettings("noYearTitle")}
        description={tSettings("noYearDescription")}
      />
    );
  } else if (error) {
    body = <ErrorState variant="inline" retry kind={errorKind(error)} description={error.message} />;
  } else if (view) {
    const missingDates = !view.start_date || !view.end_date;
    body = (
      <>
        <div className="px-5 py-4 text-sm">
          {missingDates ? (
            <p className="text-warning-foreground dark:text-warning">{t("notOperational")}</p>
          ) : (
            <p>
              {t("range", {
                start: formatCivilDate(view.start_date, locale) ?? "",
                end: formatCivilDate(view.end_date, locale) ?? "",
              })}
            </p>
          )}
          {!view.configured && !missingDates && (
            <p className="mt-1 text-muted-foreground">{t("defaultNotice")}</p>
          )}
          {!view.can_edit && <p className="mt-1 text-muted-foreground">{t("readOnly")}</p>}
        </div>
        {view.can_edit && (
          <>
            <SettingsRow
              label={<Label htmlFor="window-start">{t("startLabel")}</Label>}
              control={
                <DateField id="window-start" yearStart={yearStart} yearEnd={yearEnd}
                  error={errors.start_date?.message} {...form.register("start_date")} />
              }
            />
            <SettingsRow
              label={<Label htmlFor="window-end">{t("endLabel")}</Label>}
              control={
                <DateField id="window-end" yearStart={yearStart} yearEnd={yearEnd}
                  error={errors.end_date?.message} {...form.register("end_date")} />
              }
            />
          </>
        )}
      </>
    );
  } else {
    body = null;
  }

  return (
    <form onSubmit={submit} noValidate>
      <SettingsSection title={t("title")} description={t("description")}>
        {body}
      </SettingsSection>
      {view?.can_edit && !error && yearId !== null && (
        <SettingsSaveBar dirty={isDirty} pending={isSubmitting} onSave={() => void submit()} />
      )}
    </form>
  );
}

function DateField({
  error,
  yearStart,
  yearEnd,
  ...props
}: React.ComponentProps<typeof Input> & {
  error?: string;
  yearStart: string | null;
  yearEnd: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Input
        type="date"
        className="w-44"
        min={yearStart ?? undefined}
        max={yearEnd ?? undefined}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && (
        <p role="alert" className="max-w-64 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Pastors ─────────────────────────────────────────────────────────────────

type AssignTarget = { districtId: number; districtName: string; assignedUserIds: string[] };
type PendingRemoval = { districtId: number; districtName: string; pastor: DistrictPastor };

function PastorsSection({
  districts,
  districtsError,
  quota,
  quotaError,
}: {
  districts: DistrictPastorsEntry[];
  districtsError: SettingsLoadError | null;
  quota: PastorQuota | null;
  quotaError: SettingsLoadError | null;
}) {
  const t = useTranslations("investiture_config.pastors");
  const tq = useTranslations("queues.investitures.settings.pastors");
  const tRoot = useTranslations("investiture_requests");
  const router = useRouter();
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  // The quota editor (super-admin) is not an assigner; the API also says so per district.
  const canManage = quota?.can_edit !== true;

  async function confirmRemoval() {
    if (!pendingRemoval) return;
    try {
      await removeDistrictPastor(pendingRemoval.districtId, pendingRemoval.pastor.user_id);
    } catch (error) {
      throw new Error(getInvestitureRequestErrorMessage(error, tRoot));
    }
    toast.success(t("removeDialog.removed"));
    router.refresh();
  }

  let districtsBody: ReactNode;
  if (districtsError) {
    districtsBody = (
      <ErrorState
        variant="inline"
        retry
        kind={errorKind(districtsError)}
        description={districtsError.message}
        className="m-4"
      />
    );
  } else if (districts.length === 0) {
    districtsBody = (
      <EmptyState
        icon={Landmark}
        title={t("noDistrictsTitle")}
        description={t("noDistrictsDescription")}
      />
    );
  } else {
    districtsBody = districts.map((district) => (
      <DistrictBlock
        key={district.districtId}
        district={district}
        canManage={canManage}
        onAssign={() =>
          setAssignTarget({
            districtId: district.districtId,
            districtName: district.name,
            assignedUserIds: district.list?.pastors.map((p) => p.user_id) ?? [],
          })
        }
        onRemove={(pastor) =>
          setPendingRemoval({ districtId: district.districtId, districtName: district.name, pastor })
        }
      />
    ));
  }

  return (
    <>
      <SettingsSection title={t("title")} description={tq("description")}>
        {quotaError ? (
          <ErrorState
            variant="inline"
            retry
            kind={errorKind(quotaError)}
            description={quotaError.message}
            className="m-4"
          />
        ) : (
          quota && <QuotaRow quota={quota} />
        )}
        {districtsBody}
      </SettingsSection>

      {assignTarget && (
        <AssignPastorDialog
          open
          onOpenChange={(next) => {
            if (!next) setAssignTarget(null);
          }}
          districtId={assignTarget.districtId}
          districtName={assignTarget.districtName}
          excludeUserIds={assignTarget.assignedUserIds}
          onAssigned={() => router.refresh()}
        />
      )}

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(next) => {
          if (!next) setPendingRemoval(null);
        }}
        tone="destructive"
        title={t("removeDialog.title")}
        description={t("removeDialog.description", {
          name: pendingRemoval ? pastorLabel(pendingRemoval.pastor, t("pastor.noName")) : "",
          district: pendingRemoval?.districtName ?? "",
        })}
        confirmLabel={t("removeDialog.confirm")}
        cancelLabel={t("removeDialog.cancel")}
        onConfirm={confirmRemoval}
      />
    </>
  );
}

function DistrictBlock({
  district,
  canManage,
  onAssign,
  onRemove,
}: {
  district: DistrictPastorsEntry;
  canManage: boolean;
  onAssign: () => void;
  onRemove: (pastor: DistrictPastor) => void;
}) {
  const t = useTranslations("investiture_config.pastors");
  const tq = useTranslations("queues.investitures.settings.pastors");
  const { list, error } = district;
  const nobodyAuthorizes = list !== null && !list.pastors.some((p) => p.can_authorize);
  const isFull = list !== null && list.pastors.length >= list.slots;

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="font-medium text-sm">{district.name}</h3>
        {list && (
          <span className="text-muted-foreground text-sm tabular-nums">
            {t("district.count", { count: list.pastors.length, slots: list.slots })}
          </span>
        )}
        {nobodyAuthorizes && <StatusBadge intent="warning" label={tq("nobodyAuthorizes")} />}
        {list && canManage && (
          <div className="ml-auto">
            {list.can_assign && !isFull ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={t("district.assignAria", { district: district.name })}
                onClick={onAssign}
              >
                <UserPlus aria-hidden="true" />
                {t("district.assign")}
              </Button>
            ) : (
              isFull && <span className="text-muted-foreground text-sm">{t("district.full")}</span>
            )}
          </div>
        )}
      </div>

      {error && (
        <ErrorState
          variant="inline"
          retry
          kind={errorKind(error)}
          description={error.message}
          className="mt-3"
        />
      )}

      {nobodyAuthorizes && (
        <p className="mt-2 text-muted-foreground text-sm">
          {list.pastors.length === 0 ? tq("nobodyHelp") : tq("onlyInactiveHelp")}
        </p>
      )}

      {list && list.pastors.length > 0 && (
        <ul className="mt-3 divide-y rounded-lg border">
          {list.pastors.map((pastor) => (
            <PastorItem
              key={pastor.user_id}
              pastor={pastor}
              canManage={canManage}
              onRemove={() => onRemove(pastor)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type PastorFlag = "ok" | "inactive" | "roleMissing";

function PastorItem({
  pastor,
  canManage,
  onRemove,
}: {
  pastor: DistrictPastor;
  canManage: boolean;
  onRemove: () => void;
}) {
  const t = useTranslations("investiture_config.pastors.pastor");
  const name = pastor.user_name?.trim() || t("noName");
  const flag: PastorFlag = pastor.account_inactive
    ? "inactive"
    : pastor.role_missing
      ? "roleMissing"
      : "ok";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-sm">{name}</span>
          <ExceptionStatus
            value={flag}
            normal={["ok"]}
            labels={{ ok: "", inactive: t("accountInactive"), roleMissing: t("roleMissing") }}
            intents={{ inactive: "neutral", roleMissing: "warning" }}
          />
        </div>
        <p className="truncate text-muted-foreground text-xs">{pastor.email ?? t("noEmail")}</p>
        {flag !== "ok" && <p className="text-muted-foreground text-xs">{t("inactiveHelp")}</p>}
      </div>
      {canManage && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t("removeAria", { name })}
          onClick={onRemove}
        >
          {t("remove")}
        </Button>
      )}
    </li>
  );
}

// ─── Quota ───────────────────────────────────────────────────────────────────

function QuotaRow({ quota: initial }: { quota: PastorQuota }) {
  const t = useTranslations("investiture_config.pastors.quota");
  const tRoot = useTranslations("investiture_requests");
  const router = useRouter();
  const [saved, setSaved] = useState<PastorQuota | null>(null);
  const view = saved ?? initial;
  const [value, setValue] = useState(String(view.slots));
  const [pending, setPending] = useState(false);
  const valid = /^\d{1,4}$/.test(value.trim());

  async function save() {
    if (!valid) return;
    setPending(true);
    try {
      const result = await updatePastorQuota(Number(value.trim()));
      setSaved(result);
      setValue(String(result.slots));
      toast.success(t("saved"));
      router.refresh();
    } catch (error) {
      toast.error(getInvestitureRequestErrorMessage(error, tRoot));
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsRow
      label={<Label htmlFor="pastor-quota">{t("title")}</Label>}
      description={view.can_edit ? t("description") : t("readOnly")}
      control={
        view.can_edit ? (
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1">
              <Input
                id="pastor-quota"
                className="w-24"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={value}
                aria-invalid={!valid}
                onChange={(event) => setValue(event.target.value)}
              />
              {!valid && (
                <p role="alert" className="text-xs text-destructive">
                  {t("invalid")}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              loading={pending}
              disabled={!valid || value.trim() === String(view.slots)}
              onClick={() => void save()}
            >
              {t("save")}
            </Button>
          </div>
        ) : (
          <p className="text-sm tabular-nums">{t("current", { slots: view.slots })}</p>
        )
      }
    />
  );
}
