"use client";


/**
 * EventTemplateFormPage
 *
 * Dedicated full-page form for creating and editing camporee event templates.
 * DS rule: >4 fields + relations + JSONB editors → dedicated page, NOT a Dialog.
 *
 * Sections:
 *   1. Identity  — scope, union/local_field select, event_type
 *   2. Content   — title, description, requirements, development, prerequisites, materials, auxiliaries
 *   3. Scoring   — max_points, min_points, PenaltiesEditor
 *   4. Participants — ParticipantsField
 *   5. Settings  — duration_seconds, active
 */

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
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

interface EventTemplateFormPageProps {
  mode: "create" | "edit";
  item?: CamporeeEventTemplate;
  allowedScopes: AllowedTemplateScope[];
  eventTypes: EventTypeOption[];
  unions: UnionOption[];
  localFields: LocalFieldOption[];
  classes: ProgressiveClass[];
  action: FormAction;
}

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

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <PageHeader
        title={isEdit ? t("editTitle") : t("createTitle")}
        breadcrumbs={[{ label: t("backToList"), href: "/dashboard/campamentos/plantillas" }]}
      />

      {/* ── Form ── */}
      <form action={formAction} className="space-y-8">
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

        {/* Error banner */}
        {actionState.error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionState.error}
          </div>
        )}

        {/* ══ Section 1: Identity ══ */}
        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight">{t("sectionIdentity")}</h2>

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
              <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
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
          <div className="space-y-2">
            <Label>
              {t("fieldEventType")} <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedEventTypeId} onValueChange={setSelectedEventTypeId}>
              <SelectTrigger>
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
        </section>

        {/* ══ Section 2: Content ══ */}
        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight">{t("sectionContent")}</h2>

          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label htmlFor="description">{t("fieldDescription")}</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={item?.description ?? ""}
              placeholder={t("fieldDescriptionPlaceholder")}
            />
          </div>

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
              rows={2}
              defaultValue={item?.auxiliaries ?? ""}
              placeholder={t("fieldAuxiliariesPlaceholder")}
            />
          </div>
        </section>

        {/* ══ Section 3: Scoring ══ */}
        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight">{t("sectionScoring")}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
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
        </section>

        <RubricsEditor
          enabled={scoringEnabled}
          onEnabledChange={setScoringEnabled}
          value={rubrics}
          onChange={setRubrics}
          maxPoints={maxPoints}
        />

        {/* ══ Section 4: Participants ══ */}
        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight">{t("sectionParticipants")}</h2>
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
        </section>

        {/* ══ Section 5: Settings ══ */}
        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight">{t("sectionSettings")}</h2>

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

          <div className="flex items-center gap-2">
            <Checkbox
              id="active"
              checked={activeChecked}
              onCheckedChange={(checked) => setActiveChecked(!!checked)}
            />
            <Label htmlFor="active">{t("fieldActive")}</Label>
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button variant="outline" asChild>
            <Link href={"/dashboard/campamentos/plantillas"}>{t("buttonCancel")}</Link>
          </Button>
          <SubmitButton label={isEdit ? t("buttonSave") : t("buttonCreate")} />
        </div>
      </form>
    </div>
  );
}
