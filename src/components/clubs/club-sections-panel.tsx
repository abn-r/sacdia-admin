"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Power,
  Save,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberOfMonthCard } from "@/components/member-of-month/member-of-month-card";
import { SectionDirectorSuccessionCard } from "@/components/clubs/section-director-succession-card";
import {
  createClubSectionAction,
  updateClubSectionAction,
  type ClubActionState,
} from "@/lib/clubs/actions";
import { useFormatCurrency } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

type Section = {
  club_section_id?: number;
  club_type_id?: number;
  club_type?: { name?: string } | null;
  club_types?: { club_type_id?: number; name?: string } | null;
  name?: string;
  active?: boolean;
  souls_target?: number | null;
  fee?: number | null;
  meeting_day?: Array<{ day?: string }>;
  meeting_time?: Array<{ time?: string }>;
  members_count?: number;
};

const DAY_VALUES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function getFirstString(
  value: Array<Record<string, unknown>> | undefined,
  key: "day" | "time",
) {
  const first = value?.[0]?.[key];
  return typeof first === "string" ? first : "";
}

function getSectionTypeName(section: Section) {
  return section.club_type?.name ?? section.club_types?.name;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      {label}
    </Button>
  );
}

function StatusSubmitButton({ active }: { active: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations("clubs");
  return (
    <Button
      type="submit"
      size="sm"
      variant={active ? "outline" : "default"}
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
      {active ? t("sections.deactivateButton") : t("sections.activateButton")}
    </Button>
  );
}

function SaveSectionButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("clubs");
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {t("sections.saveButton")}
    </Button>
  );
}

function CreateSectionForm({
  clubId,
  clubTypeId,
  onSuccess,
}: {
  clubId: number;
  clubTypeId: number;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("clubs");
  const boundAction = createClubSectionAction.bind(null, clubId);
  const [state, action] = useActionState(boundAction, {} as ClubActionState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onSuccess();
    }
  }, [state.success, router, onSuccess]);

  const fieldErrors = state.fieldErrors ?? {};
  const ariaInvalid = (name: string) => (fieldErrors[name] ? true : undefined);
  const describedBy = (name: string) =>
    fieldErrors[name] ? `section-${clubTypeId}-${name}-error` : undefined;
  const renderError = (name: string) =>
    fieldErrors[name] ? (
      <p
        id={`section-${clubTypeId}-${name}-error`}
        role="alert"
        className="text-xs text-destructive"
      >
        {fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form action={action} className="space-y-4 border-t pt-4" noValidate>
      <input type="hidden" name="club_type_id" value={clubTypeId} />
      {state.error && (
        <p role="alert" aria-live="polite" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`name_${clubTypeId}`}>{t("sections.labelName")}</Label>
          <Input id={`name_${clubTypeId}`} name="name" placeholder={t("sections.placeholderName")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`souls_${clubTypeId}`}>{t("sections.labelSoulsTarget")}</Label>
          <Input
            id={`souls_${clubTypeId}`}
            name="souls_target"
            type="number"
            min="0"
            defaultValue="0"
            aria-invalid={ariaInvalid("souls_target")}
            aria-describedby={describedBy("souls_target")}
          />
          {renderError("souls_target")}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`fee_${clubTypeId}`}>{t("sections.labelFee")}</Label>
          <Input
            id={`fee_${clubTypeId}`}
            name="fee"
            type="number"
            min="0"
            step="1"
            defaultValue="0"
            aria-invalid={ariaInvalid("fee")}
            aria-describedby={describedBy("fee")}
          />
          {renderError("fee")}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`day_${clubTypeId}`}>{t("sections.labelMeetingDay")}</Label>
          <Select name="meeting_day">
            <SelectTrigger id={`day_${clubTypeId}`}>
              <SelectValue placeholder={t("sections.placeholderMeetingDay")} />
            </SelectTrigger>
            <SelectContent>
              {DAY_VALUES.map((day) => (
                <SelectItem key={day} value={day}>
                  {t(`sections.daysOfWeek.${day}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`time_${clubTypeId}`}>{t("sections.labelMeetingTime")}</Label>
          <Input
            id={`time_${clubTypeId}`}
            name="meeting_time"
            type="time"
            defaultValue="09:00"
            step="60"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <SubmitButton label={t("sections.createButton")} />
      </div>
    </form>
  );
}

function EditSectionForm({
  clubId,
  sectionId,
  section,
  label,
  onCancel,
}: {
  clubId: number;
  sectionId: number;
  section: Section;
  label: string;
  onCancel: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("clubs");
  const boundAction = updateClubSectionAction.bind(null, clubId, sectionId);
  const [state, action] = useActionState(boundAction, {} as ClubActionState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onCancel();
    }
  }, [state.success, router, onCancel]);

  const fieldErrors = state.fieldErrors ?? {};
  const ariaInvalid = (name: string) => (fieldErrors[name] ? true : undefined);
  const describedBy = (name: string) =>
    fieldErrors[name] ? `section-${sectionId}-${name}-error` : undefined;
  const renderError = (name: string) =>
    fieldErrors[name] ? (
      <p id={`section-${sectionId}-${name}-error`} role="alert" className="text-xs text-destructive">
        {fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form action={action} className="space-y-4 border-t pt-4" noValidate>
      {state.error && (
        <p role="alert" aria-live="polite" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <input type="hidden" name="active" value={String(section.active !== false)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`edit_name_${sectionId}`}>{t("sections.labelName")}</Label>
          <Input
            id={`edit_name_${sectionId}`}
            name="name"
            defaultValue={section.name ?? ""}
            placeholder={label}
            aria-invalid={ariaInvalid("name")}
            aria-describedby={describedBy("name")}
          />
          {renderError("name")}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`edit_souls_${sectionId}`}>{t("sections.labelSoulsTarget")}</Label>
          <Input
            id={`edit_souls_${sectionId}`}
            name="souls_target"
            type="number"
            min="0"
            step="1"
            defaultValue={section.souls_target ?? 0}
            aria-invalid={ariaInvalid("souls_target")}
            aria-describedby={describedBy("souls_target")}
          />
          {renderError("souls_target")}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`edit_fee_${sectionId}`}>{t("sections.labelFee")}</Label>
          <Input
            id={`edit_fee_${sectionId}`}
            name="fee"
            type="number"
            min="0"
            step="1"
            defaultValue={section.fee ?? 0}
            aria-invalid={ariaInvalid("fee")}
            aria-describedby={describedBy("fee")}
          />
          {renderError("fee")}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`edit_day_${sectionId}`}>{t("sections.labelMeetingDay")}</Label>
          <Select name="meeting_day" defaultValue={getFirstString(section.meeting_day, "day")}>
            <SelectTrigger id={`edit_day_${sectionId}`}>
              <SelectValue placeholder={t("sections.placeholderMeetingDay")} />
            </SelectTrigger>
            <SelectContent>
              {DAY_VALUES.map((day) => (
                <SelectItem key={day} value={day}>
                  {t(`sections.daysOfWeek.${day}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`edit_time_${sectionId}`}>{t("sections.labelMeetingTime")}</Label>
          <Input
            id={`edit_time_${sectionId}`}
            name="meeting_time"
            type="time"
            defaultValue={getFirstString(section.meeting_time, "time") || "09:00"}
            step="60"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          {t("sections.cancelButton")}
        </Button>
        <SaveSectionButton />
      </div>
    </form>
  );
}

function SectionStatusForm({
  clubId,
  sectionId,
  active,
}: {
  clubId: number;
  sectionId: number;
  active: boolean;
}) {
  const router = useRouter();
  const boundAction = updateClubSectionAction.bind(null, clubId, sectionId);
  const [state, action] = useActionState(boundAction, {} as ClubActionState);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="active" value={String(!active)} />
      <StatusSubmitButton active={active} />
      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

interface ClubSectionsPanelProps {
  clubId: number;
  sections: Section[];
  clubTypes?: Array<{ club_type_id: number; name: string }>;
  onAssignResponsible?: () => void;
  onSectionSelect?: (sectionId: number | null) => void;
}

export function ClubSectionsPanel({
  clubId,
  sections,
  clubTypes,
  onAssignResponsible,
  onSectionSelect,
}: ClubSectionsPanelProps) {
  const t = useTranslations("clubs");
  const tw = useTranslations("clubs.sections.workspace");
  const formatCurrency = useFormatCurrency();
  const [sectionSearch, setSectionSearch] = useState("");
  const [openCreateTypeId, setOpenCreateTypeId] = useState<number | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const existingByTypeId = useMemo(
    () => new Map(sections.map((section) => [section.club_type_id, section])),
    [sections],
  );

  const typesToRender = useMemo(
    () =>
      clubTypes ??
      sections.map((section) => ({
        club_type_id: section.club_type_id ?? 0,
        name: getSectionTypeName(section) ?? section.name ?? `Seccion ${section.club_section_id}`,
      })),
    [clubTypes, sections],
  );

  const createdSections = useMemo(
    () =>
      typesToRender
        .map((clubType) => {
          const section = existingByTypeId.get(clubType.club_type_id);
          if (!section?.club_section_id) return null;
          return {
            clubType,
            section,
            sectionId: section.club_section_id,
            label: section.name ?? getSectionTypeName(section) ?? clubType.name,
            typeName: clubType.name,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null),
    [existingByTypeId, typesToRender],
  );

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    createdSections[0]?.sectionId ?? null,
  );

  useEffect(() => {
    if (
      selectedSectionId != null &&
      createdSections.some((item) => item.sectionId === selectedSectionId)
    ) {
      return;
    }
    setSelectedSectionId(createdSections[0]?.sectionId ?? null);
  }, [createdSections, selectedSectionId]);

  const selectedEntry = createdSections.find((item) => item.sectionId === selectedSectionId);

  function selectSection(sectionId: number | null) {
    setSelectedSectionId(sectionId);
    onSectionSelect?.(sectionId);
  }

  const filteredTypes = typesToRender.filter((clubType) => {
    const section = existingByTypeId.get(clubType.club_type_id);
    const haystack = [
      clubType.name,
      section?.name,
      section?.club_section_id,
      getSectionTypeName(section ?? {}),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(sectionSearch.trim().toLowerCase());
  });

  function handleEditSelected() {
    if (selectedSectionId != null) {
      setEditingSectionId(selectedSectionId);
    }
  }

  function goToResponsables() {
    onAssignResponsible?.();
  }

  return (
    <div className="space-y-5 p-5" key={refreshKey}>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {tw("eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {tw("title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{tw("lead")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selectedSectionId == null}
            onClick={handleEditSelected}
          >
            <Pencil className="size-4" />
            {tw("editSection")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={goToResponsables}
          >
            <UserPlus className="size-4" />
            {tw("assignResponsible")}
          </Button>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)] xl:items-start">
            <aside className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="searchSections">{tw("searchSection")}</Label>
                <Input
                  id="searchSections"
                  type="search"
                  value={sectionSearch}
                  onChange={(event) => setSectionSearch(event.target.value)}
                  placeholder={tw("searchSectionPlaceholder")}
                />
              </div>

              <div className="grid gap-2">
                {filteredTypes.map((clubType) => {
                  const section = existingByTypeId.get(clubType.club_type_id);
                  const isCreated = section?.club_section_id != null;
                  const isActive =
                    isCreated && section?.club_section_id === selectedSectionId;
                  const isCreateOpen = openCreateTypeId === clubType.club_type_id;

                  if (!isCreated) {
                    return (
                      <div
                        key={clubType.club_type_id}
                        className="rounded-xl border border-dashed bg-muted/10 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <XCircle className="mt-0.5 size-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-semibold">{clubType.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {t("sections.notCreated")}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setOpenCreateTypeId((current) =>
                                current === clubType.club_type_id ? null : clubType.club_type_id,
                              )
                            }
                          >
                            {isCreateOpen ? (
                              <>
                                <ChevronUp className="size-4" />
                                {t("sections.cancelButton")}
                              </>
                            ) : (
                              <>
                                <Plus className="size-4" />
                                {t("sections.addButton")}
                              </>
                            )}
                          </Button>
                        </div>
                        {isCreateOpen && (
                          <CreateSectionForm
                            clubId={clubId}
                            clubTypeId={clubType.club_type_id}
                            onSuccess={() => {
                              setOpenCreateTypeId(null);
                              setRefreshKey((value) => value + 1);
                            }}
                          />
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={clubType.club_type_id}
                      type="button"
                      onClick={() => selectSection(section.club_section_id ?? null)}
                      className={cn(
                        "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors",
                        isActive
                          ? "border-foreground shadow-[inset_3px_0_0_0_hsl(var(--foreground))]"
                          : "hover:border-foreground/30",
                      )}
                    >
                      <span className="grid size-8 place-items-center rounded-full border">
                        <CheckCircle2 className="size-4" />
                      </span>
                      <span>
                        <strong className="block text-sm">
                          {section.name ?? getSectionTypeName(section) ?? clubType.name}
                        </strong>
                        <small className="block text-xs text-muted-foreground">
                          {clubType.name} · ID {section.club_section_id}
                        </small>
                      </span>
                      <Badge variant={section.active !== false ? "soft-success" : "outline"}>
                        {section.active !== false
                          ? t("sections.statusActive")
                          : t("sections.statusInactive")}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </aside>

            <article className="rounded-2xl border bg-card p-5 shadow-sm">
              {!selectedEntry ? (
                <div className="rounded-xl border border-dashed px-4 py-10 text-sm text-muted-foreground">
                  {tw("selectSectionPrompt")}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Badge variant={selectedEntry.section.active !== false ? "soft-success" : "outline"}>
                        {selectedEntry.section.active !== false
                          ? t("sections.statusActive")
                          : t("sections.statusInactive")}
                      </Badge>
                      <h3 className="mt-3 text-xl font-semibold tracking-tight">
                        {selectedEntry.label}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {tw("sectionDetailLead", {
                          section: selectedEntry.label,
                          type: selectedEntry.typeName,
                        })}
                      </p>
                    </div>
                    {selectedEntry.section.club_section_id != null && (
                      <SectionStatusForm
                        clubId={clubId}
                        sectionId={selectedEntry.section.club_section_id}
                        active={selectedEntry.section.active !== false}
                      />
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                      value={selectedEntry.typeName}
                      label={t("sections.infoType")}
                    />
                    <Metric
                      value={String(selectedEntry.section.club_section_id ?? "—")}
                      label={t("sections.infoSectionId")}
                    />
                    <Metric
                      value={String(selectedEntry.section.souls_target ?? 0)}
                      label={t("sections.labelSoulsTarget")}
                    />
                    <Metric
                      value={
                        selectedEntry.section.fee != null
                          ? formatCurrency(selectedEntry.section.fee)
                          : "—"
                      }
                      label={t("sections.infoCuota")}
                    />
                  </div>

                  <div className="my-5 border-t" />

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold">{tw("responsiblesRuleTitle")}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tw("responsiblesRuleLead", { type: selectedEntry.typeName })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={goToResponsables}
                    >
                      {tw("viewResponsibles")}
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>

                  {selectedEntry.section.club_section_id != null &&
                    editingSectionId === selectedEntry.section.club_section_id && (
                      <EditSectionForm
                        clubId={clubId}
                        sectionId={selectedEntry.section.club_section_id}
                        section={selectedEntry.section}
                        label={selectedEntry.typeName}
                        onCancel={() => setEditingSectionId(null)}
                      />
                    )}

                  {selectedEntry.section.club_section_id != null && (
                    <div className="mt-5 space-y-4 border-t pt-5">
                      <MemberOfMonthCard
                        clubId={clubId}
                        sectionId={selectedEntry.section.club_section_id}
                        sectionName={selectedEntry.label}
                        isDirector={false}
                      />
                      <SectionDirectorSuccessionCard
                        clubId={clubId}
                        sectionId={selectedEntry.section.club_section_id}
                        sectionName={selectedEntry.label}
                      />
                    </div>
                  )}
                </>
              )}
            </article>
          </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border bg-background p-3.5">
      <b className="block font-mono text-xl tabular-nums">{value}</b>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
