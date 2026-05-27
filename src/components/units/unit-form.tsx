"use client";

import { useActionState, useState, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberCombobox } from "@/components/units/member-combobox";
import type { UnitActionState } from "@/lib/units/actions";
import type { Unit } from "@/lib/api/units";
import type { ClubSectionMember } from "@/lib/api/clubs";

export type UnitSectionOption = {
  id: number;
  name: string;
  clubTypeId: number;
  clubTypeName?: string | null;
};

// ─── Submit button ────────────────────────────────────────────────────────────

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const t = useTranslations("units_admin.unitForm");
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending
        ? mode === "create"
          ? t("submittingCreate")
          : t("submittingEdit")
        : mode === "create"
          ? t("submitCreate")
          : t("submitEdit")}
    </Button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface UnitFormProps {
  mode: "create" | "edit";
  clubId: number;
  sectionOptions: UnitSectionOption[];
  initialData?: Unit | null;
  formAction: (
    prev: UnitActionState,
    formData: FormData,
  ) => Promise<UnitActionState>;
}

// ─── Component ────────────────────────────────────────────────────────────────

const initialState: UnitActionState = {};

export function UnitForm({
  mode,
  clubId,
  sectionOptions,
  initialData,
  formAction,
}: UnitFormProps) {
  const t = useTranslations("units_admin.unitForm");

  // Club type options must live inside the component so t() is in scope
  const CLUB_TYPES = [
    { value: 1, label: t("clubTypeAdventurers") },
    { value: 2, label: t("clubTypePathfinders") },
    { value: 3, label: t("clubTypeMasterGuides") },
  ];

  const [state, action] = useActionState(formAction, initialState);

  const defaultSectionId =
    initialData?.club_section_id ?? sectionOptions[0]?.id ?? "";
  const defaultSection = sectionOptions.find((s) => s.id === defaultSectionId);
  const defaultClubType =
    initialData?.club_type_id ?? defaultSection?.clubTypeId ?? 2;
  const [selectedSectionId, setSelectedSectionId] = useState<
    number | ""
  >(defaultSectionId);
  const [clubTypeId, setClubTypeId] = useState(defaultClubType);

  // Controlled state for the 4 leader comboboxes
  const [captainId, setCaptainId] = useState(initialData?.captain_id ?? "");
  const [secretaryId, setSecretaryId] = useState(initialData?.secretary_id ?? "");
  const [advisorId, setAdvisorId] = useState(initialData?.advisor_id ?? "");
  const [substituteAdvisorId, setSubstituteAdvisorId] = useState(
    initialData?.substitute_advisor_id ?? "",
  );

  // Shared member list — fetched once, reused across the 4 comboboxes
  const [sharedMembers, setSharedMembers] = useState<ClubSectionMember[] | undefined>(undefined);
  const handleMembersLoaded = useCallback((members: ClubSectionMember[]) => {
    setSharedMembers(members);
  }, []);
  const memberSectionId =
    typeof selectedSectionId === "number" ? selectedSectionId : undefined;

  const fieldErrors = state.fieldErrors ?? {};
  const ariaInvalid = (field: string) =>
    fieldErrors[field] ? true : undefined;
  const describedBy = (field: string) =>
    fieldErrors[field] ? `unit-${field}-error` : undefined;
  const renderError = (field: string) =>
    fieldErrors[field] ? (
      <p
        id={`unit-${field}-error`}
        role="alert"
        className="text-xs text-destructive"
      >
        {fieldErrors[field]}
      </p>
    ) : null;

  function handleSectionChange(value: string) {
    if (!value) {
      setSelectedSectionId("");
      setSharedMembers(undefined);
      setCaptainId("");
      setSecretaryId("");
      setAdvisorId("");
      setSubstituteAdvisorId("");
      return;
    }
    const nextSectionId = Number(value);
    setSelectedSectionId(Number.isFinite(nextSectionId) ? nextSectionId : "");
    const section = sectionOptions.find((s) => s.id === nextSectionId);
    if (section) setClubTypeId(section.clubTypeId);
    if (nextSectionId !== selectedSectionId) {
      setSharedMembers(undefined);
      setCaptainId("");
      setSecretaryId("");
      setAdvisorId("");
      setSubstituteAdvisorId("");
    }
  }

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      {/* ── Datos generales ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("generalData")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Nombre */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">
              {t("name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialData?.name ?? ""}
              placeholder={t("namePlaceholder")}
              required
              aria-required="true"
              aria-invalid={ariaInvalid("name")}
              aria-describedby={describedBy("name")}
            />
            {renderError("name")}
          </div>

          {/* Tipo de club */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="club_section_id">
              {t("clubSection")} <span className="text-destructive">*</span>
            </Label>
            <select
              id="club_section_id"
              name="club_section_id"
              value={selectedSectionId}
              onChange={(event) => handleSectionChange(event.target.value)}
              required
              aria-required="true"
              aria-invalid={ariaInvalid("club_section_id")}
              aria-describedby={describedBy("club_section_id")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {sectionOptions.length === 0 ? (
                <option value="">{t("clubSectionEmpty")}</option>
              ) : (
                sectionOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                    {section.clubTypeName ? ` · ${section.clubTypeName}` : ""}
                  </option>
                ))
              )}
            </select>
            {renderError("club_section_id")}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="club_type_id">
              {t("clubType")} <span className="text-destructive">*</span>
            </Label>
            <select
              id="club_type_id"
              value={clubTypeId}
              disabled
              aria-invalid={ariaInvalid("club_type_id")}
              aria-describedby={describedBy("club_type_id")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CLUB_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
            <input type="hidden" name="club_type_id" value={clubTypeId} />
            {renderError("club_type_id")}
          </div>
        </CardContent>
      </Card>

      {/* ── Lideres de la unidad ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("leaders")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {t("requiredHint")}{" "}
            <span className="text-destructive">*</span>{" "}
            {t("requiredHintSuffix")}
          </p>

          {/* Capitan */}
          <div className="space-y-2 sm:col-span-2">
            <Label>
              {t("captain")} <span className="text-destructive">*</span>
            </Label>
            <MemberCombobox
              clubId={clubId}
              sectionId={memberSectionId}
              value={captainId}
              onChange={setCaptainId}
              placeholder={t("captainPlaceholder")}
              disabled={!memberSectionId}
              excludeUserIds={[secretaryId, advisorId, substituteAdvisorId].filter(Boolean)}
              members={sharedMembers}
              onMembersLoaded={handleMembersLoaded}
            />
            {/* Hidden input carries the value into FormData */}
            <input type="hidden" name="captain_id" value={captainId} />
            {renderError("captain_id")}
          </div>

          {/* Secretario */}
          <div className="space-y-2 sm:col-span-2">
            <Label>
              {t("secretary")} <span className="text-destructive">*</span>
            </Label>
            <MemberCombobox
              clubId={clubId}
              sectionId={memberSectionId}
              value={secretaryId}
              onChange={setSecretaryId}
              placeholder={t("secretaryPlaceholder")}
              disabled={!memberSectionId}
              excludeUserIds={[captainId, advisorId, substituteAdvisorId].filter(Boolean)}
              members={sharedMembers}
              onMembersLoaded={handleMembersLoaded}
            />
            <input type="hidden" name="secretary_id" value={secretaryId} />
            {renderError("secretary_id")}
          </div>

          {/* Consejero */}
          <div className="space-y-2 sm:col-span-2">
            <Label>
              {t("advisor")} <span className="text-destructive">*</span>
            </Label>
            <MemberCombobox
              clubId={clubId}
              sectionId={memberSectionId}
              value={advisorId}
              onChange={setAdvisorId}
              placeholder={t("advisorPlaceholder")}
              disabled={!memberSectionId}
              excludeUserIds={[captainId, secretaryId, substituteAdvisorId].filter(Boolean)}
              members={sharedMembers}
              onMembersLoaded={handleMembersLoaded}
            />
            <input type="hidden" name="advisor_id" value={advisorId} />
            {renderError("advisor_id")}
          </div>

          {/* Consejero suplente */}
          <div className="space-y-2 sm:col-span-2">
            <Label>
              {t("substituteAdvisor")}{" "}
              <span className="text-muted-foreground">{t("substituteAdvisorOptional")}</span>
            </Label>
            <MemberCombobox
              clubId={clubId}
              sectionId={memberSectionId}
              value={substituteAdvisorId}
              onChange={setSubstituteAdvisorId}
              placeholder={t("substituteAdvisorPlaceholder")}
              disabled={!memberSectionId}
              excludeUserIds={[captainId, secretaryId, advisorId].filter(Boolean)}
              members={sharedMembers}
              onMembersLoaded={handleMembersLoaded}
            />
            <input type="hidden" name="substitute_advisor_id" value={substituteAdvisorId} />
            {renderError("substitute_advisor_id")}
          </div>
        </CardContent>
      </Card>

      {/* ── Acciones ── */}
      <div className="flex justify-end">
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
