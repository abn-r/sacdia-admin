"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  FormModalBody,
  FormModalFooter,
  FormModalSteps,
  useFormModal,
} from "@/components/shared/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClubActionState } from "@/lib/clubs/actions";
import { LocationPicker } from "@/components/shared/location-picker";
import { PrerequisiteNotice } from "@/components/shared/prerequisite-notice";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { isMasterGuidesClubType } from "@/lib/clubs/club-type";
import {
  filterChurchesByDistrict,
  filterDistrictsByLocalField,
  type ChurchOption,
  type DistrictOption,
  type SelectOption,
} from "@/lib/clubs/create-form-options";
import {
  findClubCreateGaps,
  type ClubCreateGap,
} from "@/lib/prerequisites/club-create-gaps";
import { resolvePrerequisiteHref } from "@/lib/prerequisites/resolve-prerequisite-href";

function clubGapCopy(
  t: ReturnType<typeof useTranslations<"clubs.create.prerequisites">>,
  gap: ClubCreateGap,
) {
  switch (gap.id) {
    case "local-fields":
      return {
        description: t("local-fields"),
        actionLabel: t("go.local-fields"),
      };
    case "club-types":
      return {
        description: t("club-types"),
        actionLabel: t("go.club-types"),
      };
    case "districts":
      return {
        description: t("districts", { name: gap.contextName ?? "" }),
        actionLabel: t("go.districts"),
      };
    case "churches":
      return {
        description: t("churches", { name: gap.contextName ?? "" }),
        actionLabel: t("go.churches"),
      };
  }
}

const LIST_HREF = "/dashboard/clubs";

/** Server field errors → the step that owns the field, so a failed submit lands where the problem is. */
const STEP_FIELDS: ReadonlyArray<ReadonlyArray<string>> = [
  ["name", "description", "local_field_id", "district_id", "church_id", "address"],
  ["sections"],
  ["coordinates"],
];
const LAST_STEP = STEP_FIELDS.length - 1;

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations("clubs");
  return (
    <Button loading={pending} type="submit" disabled={disabled}>
      {t("create.submitButton")}
    </Button>
  );
}

interface CreateClubFormProps {
  localFields: SelectOption[];
  districts: DistrictOption[];
  churches: ChurchOption[];
  clubTypes: SelectOption[];
  formAction: (prev: ClubActionState, formData: FormData) => Promise<ClubActionState>;
  googleMapsApiKey: string;
  googleMapsMapId?: string;
  initialLocalFieldId?: string;
  lockLocalField?: boolean;
}

const initialState: ClubActionState = {};

export function CreateClubForm({
  localFields,
  districts,
  churches,
  clubTypes,
  formAction,
  googleMapsApiKey,
  googleMapsMapId,
  initialLocalFieldId = "",
  lockLocalField = false,
}: CreateClubFormProps) {
  const [state, action] = useActionState(formAction, initialState);
  const t = useTranslations("clubs");
  const tPrereq = useTranslations("clubs.create.prerequisites");
  const { subject } = useScreenAccess();
  const [localFieldValue, setLocalFieldValue] = useState(initialLocalFieldId);
  const [districtValue, setDistrictValue] = useState("");
  const [churchValue, setChurchValue] = useState("");

  const selectedLocalFieldId = localFieldValue ? Number(localFieldValue) : null;
  const selectedDistrictId = districtValue ? Number(districtValue) : null;

  const filteredDistricts = useMemo(
    () => filterDistrictsByLocalField(districts, selectedLocalFieldId),
    [districts, selectedLocalFieldId],
  );
  const filteredChurches = useMemo(
    () => filterChurchesByDistrict(churches, selectedDistrictId),
    [churches, selectedDistrictId],
  );
  const createGaps = useMemo(
    () =>
      findClubCreateGaps({
        localFields,
        districts,
        churches,
        clubTypes,
        selectedLocalFieldId,
        selectedDistrictId,
      }),
    [
      localFields,
      districts,
      churches,
      clubTypes,
      selectedLocalFieldId,
      selectedDistrictId,
    ],
  );
  const prerequisiteItems = useMemo(
    () =>
      createGaps.map((gap) => {
        const copy = clubGapCopy(tPrereq, gap);
        return {
          id: gap.id,
          description: copy.description,
          href: resolvePrerequisiteHref(subject, gap.screenId),
          actionLabel: copy.actionLabel,
        };
      }),
    [createGaps, subject, tPrereq],
  );

  const tModal = useTranslations("shared.formModal");
  const modal = useFormModal(LIST_HREF);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  // The map only initializes once its step is visible; keep it mounted afterwards.
  const [mapVisited, setMapVisited] = useState(false);
  const [stepIncomplete, setStepIncomplete] = useState(false);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  const fieldErrors = state.fieldErrors ?? {};

  useEffect(() => {
    const errored = Object.keys(state.fieldErrors ?? {});
    if (errored.length === 0) return;
    const target = STEP_FIELDS.findIndex((fields) => fields.some((field) => errored.includes(field)));
    if (target >= 0) {
      setDirection(target < step ? "back" : "forward");
      setStep(target);
    }
    // Only react to a new server response, not to local step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function goTo(next: number) {
    setStepIncomplete(false);
    setDirection(next < step ? "back" : "forward");
    setStep(next);
    if (next === LAST_STEP) setMapVisited(true);
  }

  function goNext() {
    const container = stepRefs.current[step];
    const invalid = container
      ? Array.from(container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          "input[required], select[required], textarea[required]",
        )).filter((element) => !element.disabled && !element.value.trim())
      : [];
    if (invalid.length > 0) {
      setStepIncomplete(true);
      const firstVisible = invalid.find((element) => element.type !== "hidden" && element.getAttribute("aria-hidden") !== "true");
      firstVisible?.focus();
      return;
    }
    goTo(Math.min(step + 1, LAST_STEP));
  }

  // Enter on an earlier step advances instead of submitting a half-filled club.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (step < LAST_STEP) {
      event.preventDefault();
      goNext();
    }
  }
  const ariaInvalid = (field: string) =>
    fieldErrors[field] ? true : undefined;
  const describedBy = (field: string) =>
    fieldErrors[field] ? `${field}-error` : undefined;

  return (
    <form action={action} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <FormModalSteps
        steps={[t("create.cardTitle"), t("create.sectionsTitle"), t("form.coordinatesTitle")]}
        current={step}
      />
      <FormModalBody stepKey={step} direction={direction} className="space-y-5">
      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <PrerequisiteNotice
        title={tPrereq("title")}
        items={prerequisiteItems}
        contactAdminLabel={tPrereq("contactAdmin")}
      />

      {stepIncomplete && (
        <p role="alert" className="text-sm text-destructive">
          {t("create.stepIncomplete")}
        </p>
      )}

      {/* Steps stay mounted (hidden) so the server action receives every field. */}
      <div
        ref={(element) => {
          stepRefs.current[0] = element;
        }}
        hidden={step !== 0}
        className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
      >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">
              {t("form.labelName")}{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder={t("create.placeholderName")}
              required
              aria-required="true"
              aria-invalid={ariaInvalid("name")}
              aria-describedby={describedBy("name")}
            />
            {fieldErrors.name && (
              <p
                id="name-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">{t("form.labelDescription")}</Label>
            <Textarea
              id="description"
              name="description"
              placeholder={t("create.placeholderDescription")}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="local_field_id">
              {t("fields.local_field")}{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            {lockLocalField ? (
              <input type="hidden" name="local_field_id" value={localFieldValue} />
            ) : null}
            <Select
              name={lockLocalField ? undefined : "local_field_id"}
              required={!lockLocalField}
              value={localFieldValue}
              disabled={lockLocalField}
              onValueChange={(value) => {
                setLocalFieldValue(value);
                setDistrictValue("");
                setChurchValue("");
              }}
            >
              <SelectTrigger
                className="w-full"
                id="local_field_id"
                aria-required="true"
                aria-invalid={ariaInvalid("local_field_id")}
                aria-describedby={
                  [
                    describedBy("local_field_id"),
                    lockLocalField && localFieldValue
                      ? "local_field_id-locked"
                      : undefined,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              >
                <SelectValue placeholder={t("create.placeholderLocalField")} />
              </SelectTrigger>
              <SelectContent>
                {localFields.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.local_field_id && (
              <p
                id="local_field_id-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.local_field_id}
              </p>
            )}
            {lockLocalField && localFieldValue ? (
              <p id="local_field_id-locked" className="text-xs text-muted-foreground">
                {t("create.localFieldLockedHint")}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="district_id">
              {t("fields.district")}{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Select
              name="district_id"
              required
              value={districtValue}
              onValueChange={(value) => {
                setDistrictValue(value);
                setChurchValue("");
              }}
              disabled={!selectedLocalFieldId}
            >
              <SelectTrigger
                className="w-full"
                id="district_id"
                aria-required="true"
                aria-invalid={ariaInvalid("district_id")}
                aria-describedby={describedBy("district_id")}
              >
                <SelectValue
                  placeholder={
                    selectedLocalFieldId
                      ? t("create.placeholderDistrict")
                      : t("create.placeholderDistrictParent")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredDistricts.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.district_id && (
              <p
                id="district_id-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.district_id}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="church_id">
              {t("fields.church")}{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Select
              name="church_id"
              required
              value={churchValue}
              onValueChange={setChurchValue}
              disabled={!selectedDistrictId}
            >
              <SelectTrigger
                className="w-full"
                id="church_id"
                aria-required="true"
                aria-invalid={ariaInvalid("church_id")}
                aria-describedby={describedBy("church_id")}
              >
                <SelectValue
                  placeholder={
                    selectedDistrictId
                      ? t("create.placeholderChurch")
                      : t("create.placeholderChurchParent")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredChurches.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.church_id && (
              <p
                id="church_id-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.church_id}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("form.labelAddress")}</Label>
            <Input
              id="address"
              name="address"
              placeholder={t("create.placeholderAddress")}
            />
          </div>
      </div>

      <div
        ref={(element) => {
          stepRefs.current[1] = element;
        }}
        hidden={step !== 1}
        className="grid gap-3 sm:grid-cols-2"
      >
          <p className="text-sm text-muted-foreground sm:col-span-2">
            {t("create.sectionsDescription")}
          </p>
          {fieldErrors.sections && (
            <p
              role="alert"
              className="text-xs text-destructive sm:col-span-2"
            >
              {fieldErrors.sections}
            </p>
          )}
          {clubTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              {tPrereq("club-types")}
            </p>
          ) : (
            clubTypes.map((clubType, index) => {
              const checkboxId = `section_club_type_id_${index}`;
              const isMasterGuides = isMasterGuidesClubType({
                name: clubType.label,
              });
              return (
                <div
                  key={clubType.value}
                  className="space-y-3 rounded-md border border-border/60 p-4"
                >
                  <div className="flex items-start gap-3">
                    {isMasterGuides ? (
                      <input type="hidden" name={checkboxId} value={clubType.value} />
                    ) : null}
                    <input
                      id={checkboxId}
                      name={isMasterGuides ? undefined : checkboxId}
                      type="checkbox"
                      value={clubType.value}
                      defaultChecked={isMasterGuides}
                      disabled={isMasterGuides}
                      className="mt-1 size-4 rounded border-input text-primary disabled:opacity-80"
                      aria-describedby={
                        isMasterGuides ? `${checkboxId}-locked` : undefined
                      }
                    />
                    <div className="space-y-1">
                      <Label htmlFor={checkboxId}>{clubType.label}</Label>
                      <p
                        id={isMasterGuides ? `${checkboxId}-locked` : undefined}
                        className="text-xs text-muted-foreground"
                      >
                        {isMasterGuides
                          ? t("create.sectionMasterGuidesHint")
                          : t("create.sectionToggleHint")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
      </div>

      <div
        ref={(element) => {
          stepRefs.current[2] = element;
        }}
        hidden={step !== 2}
      >
          {mapVisited || step === LAST_STEP ? (
            <LocationPicker apiKey={googleMapsApiKey} mapsMapId={googleMapsMapId} />
          ) : null}
          {fieldErrors.coordinates && (
            <p
              id="coordinates-error"
              role="alert"
              className="mt-2 text-xs text-destructive"
            >
              {fieldErrors.coordinates}
            </p>
          )}
      </div>
      </FormModalBody>

      <FormModalFooter step={step} total={STEP_FIELDS.length}>
        {step === 0 ? (
          <Button type="button" variant="outline" onClick={modal.close}>
            {t("create.cancel")}
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => goTo(step - 1)}>
            {tModal("back")}
          </Button>
        )}
        {step < LAST_STEP ? (
          <Button type="button" onClick={goNext}>
            {tModal("continue")}
          </Button>
        ) : (
          <SubmitButton disabled={createGaps.length > 0} />
        )}
      </FormModalFooter>
    </form>
  );
}
