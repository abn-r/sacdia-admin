"use client";


/**
 * EventTemplateFormPage
 *
 * Create/edit form for camporee event templates, rendered as an intercepted-route
 * modal over the template list (DS §6.1) with a full-page fallback.
 *
 * Steps (all stay mounted so the server action gets every field):
 *   1. Identity     — scope, union/local_field, event_type, title, description
 *   2. Content      — requirements, development, prerequisites, materials, auxiliaries
 *   3. Scoring      — max_points, min_points, PenaltiesEditor, RubricsEditor
 *   4. Participants — ParticipantsField, duration_seconds, active
 */

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PenaltiesEditor } from "@/components/camporee-events/penalties-editor";
import { ParticipantsField } from "@/components/camporee-events/participants-field";
import { RubricsEditor } from "@/components/camporee-events/rubrics-editor";
import { useFormSteps } from "@/components/camporee-events/use-form-steps";
import type { CamporeeEventTemplate, PenaltyRule, ParticipantsByClass, ParticipantsMode, TemplateScope } from "@/lib/api/camporee-events";
import type { CamporeeTemplateRubricInput } from "@/lib/api/camporee-scoring";
import type { CamporeeEventActionState } from "@/lib/camporee-events/actions";
import type { ProgressiveClass } from "@/lib/api/classes";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventTypeOption = { value: number; label: string };
export type UnionOption = { value: number; label: string };
export type LocalFieldOption = { value: number; label: string };
export type AllowedTemplateScope = "union" | "local_field";

type FormAction = (
  prev: CamporeeEventActionState,
  data: FormData,
) => Promise<CamporeeEventActionState>;

export interface EventTemplateFormPageProps {
  mode: "create" | "edit";
  item?: CamporeeEventTemplate;
  allowedScopes: AllowedTemplateScope[];
  eventTypes: EventTypeOption[];
  unions: UnionOption[];
  localFields: LocalFieldOption[];
  classes: ProgressiveClass[];
  action: FormAction;
}

const LIST_HREF = "/dashboard/campamentos/plantillas";

// ─── SubmitButton ─────────────────────────────────────────────────────────────

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventTemplateFormPage({
  mode,
  item,
  allowedScopes,
  eventTypes,
  unions,
  localFields,
  classes,
  action,
}: EventTemplateFormPageProps) {
  const t = useTranslations("camporeeEvents.templates");

  const [actionState, formAction] = useActionState<CamporeeEventActionState, FormData>(
    action,
    {},
  );

  const normalizedAllowedScopes = (() => {
    const normalized = (allowedScopes ?? []).filter(
      (scope): scope is AllowedTemplateScope =>
        scope === "union" || scope === "local_field",
    );

    if (normalized.length > 0) {
      return Array.from(new Set(normalized)) as AllowedTemplateScope[];
    }

    return ["union", "local_field"] as AllowedTemplateScope[];
  })();

  const scopeLocked = normalizedAllowedScopes.length === 1;

  // ── Controlled state ──────────────────────────────────────────────────────
  const [scope, setScope] = useState<TemplateScope>(() => {
    if (item?.scope && normalizedAllowedScopes.includes(item.scope)) {
      return item.scope;
    }

    return normalizedAllowedScopes[0] ?? "union";
  });

  const [selectedUnionId, setSelectedUnionId] = useState<string>(() => {
    const supportsUnion = normalizedAllowedScopes.includes("union");
    if (!supportsUnion || item?.scope !== "union" || !item?.union_id) {
      return "";
    }

    return unions.some((union) => String(union.value) === String(item.union_id))
      ? String(item.union_id)
      : "";
  });
  const [selectedLocalFieldId, setSelectedLocalFieldId] = useState<string>(() => {
    const supportsLocalField = normalizedAllowedScopes.includes("local_field");
    if (!supportsLocalField || item?.scope !== "local_field" || !item?.local_field_id) {
      return "";
    }

    return localFields.some(
      (localField) => String(localField.value) === String(item.local_field_id),
    )
      ? String(item.local_field_id)
      : "";
  });
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string>(
    item?.event_type_id ? String(item.event_type_id) : "",
  );
  const [penalties, setPenalties] = useState<PenaltyRule[]>(
    Array.isArray(item?.penalties) ? item.penalties : [],
  );
  const [maxPoints, setMaxPoints] = useState<number>(item?.max_points ?? 100);
  const [scoringEnabled, setScoringEnabled] = useState<boolean>(
    item?.scoring_enabled ?? false,
  );
  const [rubrics, setRubrics] = useState<CamporeeTemplateRubricInput[]>(
    Array.isArray(item?.rubrics)
      ? item.rubrics.map((rubric) => ({
          title: rubric.title,
          description: rubric.description,
          max_points: rubric.max_points,
          display_order: rubric.display_order,
        }))
      : [],
  );
  const [participantsMode, setParticipantsMode] = useState<ParticipantsMode>(
    item?.participants_mode ?? "count",
  );
  const [participantsCount, setParticipantsCount] = useState<number | null>(
    item?.participants_count ?? null,
  );
  const [participantsByClass, setParticipantsByClass] = useState<ParticipantsByClass[]>(
    Array.isArray(item?.participants_by_class) ? item.participants_by_class : [],
  );
  const [activeChecked, setActiveChecked] = useState<boolean>(item?.active !== false);

  const isEdit = mode === "edit";

  const tModal = useTranslations("shared.formModal");
  const modal = useFormModal(LIST_HREF);
  const steps = [
    t("sectionIdentity"),
    t("sectionContent"),
    t("sectionScoring"),
    t("sectionParticipants"),
  ];
  const {
    step,
    direction,
    lastStep,
    stepIncomplete,
    goTo,
    goNext,
    handleSubmit,
    handleKeyDown,
    stepRef,
  } = useFormSteps(steps.length);

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      {isEdit && item && (
        <input
          type="hidden"
          name="id"
          value={String(item.event_template_id)}
        />
      )}

      {/* Controlled values as hidden inputs */}
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="union_id" value={selectedUnionId} />
      <input type="hidden" name="local_field_id" value={selectedLocalFieldId} />
      <input type="hidden" name="event_type_id" value={selectedEventTypeId} />
      <input type="hidden" name="active" value={activeChecked ? "on" : ""} />

      <FormModalSteps steps={steps} current={step} />
      <FormModalBody stepKey={step} direction={direction} className="space-y-5">
        {/* Error banner */}
        {actionState.error && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {actionState.error}
          </div>
        )}

        {stepIncomplete && (
          <p role="alert" className="text-sm text-destructive">
            {t("stepIncomplete")}
          </p>
        )}

        {/* Steps stay mounted (hidden) so the server action receives every field. */}

        {/* ══ Step 1: Identity ══ */}
        <div
          ref={stepRef(0)}
          hidden={step !== 0}
          className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
        >
          {/* Scope */}
          <div className="space-y-2">
            <Label>
              {t("fieldScope")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={scope}
              disabled={scopeLocked}
              onValueChange={(v) => {
                setScope(v as TemplateScope);
                setSelectedUnionId("");
                setSelectedLocalFieldId("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("fieldScopePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {normalizedAllowedScopes.includes("union") && (
                  <SelectItem value="union">{t("fieldScopeUnion")}</SelectItem>
                )}
                {normalizedAllowedScopes.includes("local_field") && (
                  <SelectItem value="local_field">
                    {t("fieldScopeLocalField")}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Union selector */}
          {scope === "union" && (
            <div className="space-y-2">
              <Label>
                {t("fieldUnion")} <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedUnionId} onValueChange={setSelectedUnionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("fieldUnionPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {unions.map((u) => (
                    <SelectItem key={u.value} value={String(u.value)}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Local field selector */}
          {scope === "local_field" && (
            <div className="space-y-2">
              <Label>
                {t("fieldLocalField")} <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedLocalFieldId} onValueChange={setSelectedLocalFieldId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("fieldLocalFieldPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {localFields.map((lf) => (
                    <SelectItem key={lf.value} value={String(lf.value)}>
                      {lf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Event type */}
          <div className="space-y-2 sm:col-span-2">
            <Label>
              {t("fieldEventType")} <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedEventTypeId} onValueChange={setSelectedEventTypeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("fieldEventTypePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((et) => (
                  <SelectItem key={et.value} value={String(et.value)}>
                    {et.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">
              {t("fieldTitle")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={150}
              defaultValue={item?.title ?? ""}
              placeholder={t("fieldTitlePlaceholder")}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">{t("fieldDescription")}</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={item?.description ?? ""}
              placeholder={t("fieldDescriptionPlaceholder")}
            />
          </div>
        </div>

        {/* ══ Step 2: Content ══ */}
        <div ref={stepRef(1)} hidden={step !== 1} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="requirements">{t("fieldRequirements")}</Label>
            <Textarea
              id="requirements"
              name="requirements"
              rows={3}
              defaultValue={item?.requirements ?? ""}
              placeholder={t("fieldRequirementsPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="development">{t("fieldDevelopment")}</Label>
            <Textarea
              id="development"
              name="development"
              rows={4}
              defaultValue={item?.development ?? ""}
              placeholder={t("fieldDevelopmentPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prerequisites">{t("fieldPrerequisites")}</Label>
            <Textarea
              id="prerequisites"
              name="prerequisites"
              rows={3}
              defaultValue={item?.prerequisites ?? ""}
              placeholder={t("fieldPrerequisitesPlaceholder")}
            />
          </div>

          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="materials">{t("fieldMaterials")}</Label>
              <Textarea
                id="materials"
                name="materials"
                rows={3}
                defaultValue={item?.materials ?? ""}
                placeholder={t("fieldMaterialsPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auxiliaries">{t("fieldAuxiliaries")}</Label>
              <Textarea
                id="auxiliaries"
                name="auxiliaries"
                rows={3}
                defaultValue={item?.auxiliaries ?? ""}
                placeholder={t("fieldAuxiliariesPlaceholder")}
              />
            </div>
          </div>
        </div>

        {/* ══ Step 3: Scoring ══ */}
        <div ref={stepRef(2)} hidden={step !== 2} className="space-y-6">
          <div className="space-y-5">
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max_points">
                  {t("fieldMaxPoints")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="max_points"
                  name="max_points"
                  type="number"
                  min={0}
                  required
                  value={maxPoints}
                  onChange={(event) => setMaxPoints(Number(event.target.value) || 0)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_points">{t("fieldMinPoints")}</Label>
                <Input
                  id="min_points"
                  name="min_points"
                  type="number"
                  min={0}
                  defaultValue={item?.min_points ?? 0}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("fieldPenalties")}</Label>
              <PenaltiesEditor
                value={penalties}
                onChange={setPenalties}
                labels={{
                  description: t("penaltyDescription"),
                  points: t("penaltyPoints"),
                  time: t("penaltyTime"),
                  addButton: t("buttonAddPenalty"),
                  removeButton: t("buttonRemovePenalty"),
                }}
              />
            </div>
          </div>

          <RubricsEditor
            enabled={scoringEnabled}
            onEnabledChange={setScoringEnabled}
            value={rubrics}
            onChange={setRubrics}
            maxPoints={maxPoints}
          />
        </div>

        {/* ══ Step 4: Participants + settings ══ */}
        <div ref={stepRef(3)} hidden={step !== 3} className="space-y-6">
          <ParticipantsField
            mode={participantsMode}
            onModeChange={setParticipantsMode}
            count={participantsCount}
            onCountChange={setParticipantsCount}
            byClass={participantsByClass}
            onByClassChange={setParticipantsByClass}
            classes={classes}
            labels={{
              modeLabel: t("fieldParticipantsMode"),
              modeCount: t("fieldParticipantsModeCount"),
              modeByClass: t("fieldParticipantsModeByClass"),
              countLabel: t("fieldParticipantsCount"),
              addButton: t("buttonAddPenalty"),
              removeButton: t("buttonRemovePenalty"),
            }}
          />

          <section className="space-y-4">
            <h3 className="text-sm font-medium">{t("sectionSettings")}</h3>

            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration_seconds">{t("fieldDurationSeconds")}</Label>
                <Input
                  id="duration_seconds"
                  name="duration_seconds"
                  type="number"
                  min={1}
                  defaultValue={item?.duration_seconds ?? ""}
                  placeholder="—"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="active"
                checked={activeChecked}
                onCheckedChange={(checked) => setActiveChecked(!!checked)}
              />
              <Label htmlFor="active">{t("fieldActive")}</Label>
            </div>
          </section>
        </div>
      </FormModalBody>

      <FormModalFooter step={step} total={steps.length}>
        {step === 0 ? (
          <Button type="button" variant="outline" onClick={modal.close}>
            {t("buttonCancel")}
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => goTo(step - 1)}>
            {tModal("back")}
          </Button>
        )}
        {step < lastStep ? (
          <Button type="button" onClick={goNext}>
            {tModal("continue")}
          </Button>
        ) : (
          <SubmitButton label={isEdit ? t("buttonSave") : t("buttonCreate")} />
        )}
      </FormModalFooter>
    </form>
  );
}
