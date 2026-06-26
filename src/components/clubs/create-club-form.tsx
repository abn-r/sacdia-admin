"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  filterChurchesByDistrict,
  filterDistrictsByLocalField,
  type ChurchOption,
  type DistrictOption,
  type SelectOption,
} from "@/lib/clubs/create-form-options";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("clubs");
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
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
}

const initialState: ClubActionState = {};

export function CreateClubForm({
  localFields,
  districts,
  churches,
  clubTypes,
  formAction,
  googleMapsApiKey,
}: CreateClubFormProps) {
  const [state, action] = useActionState(formAction, initialState);
  const t = useTranslations("clubs");
  const [localFieldValue, setLocalFieldValue] = useState("");
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

  const fieldErrors = state.fieldErrors ?? {};
  const ariaInvalid = (field: string) =>
    fieldErrors[field] ? true : undefined;
  const describedBy = (field: string) =>
    fieldErrors[field] ? `${field}-error` : undefined;

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("create.cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
            <Select
              name="local_field_id"
              required
              value={localFieldValue}
              onValueChange={(value) => {
                setLocalFieldValue(value);
                setDistrictValue("");
                setChurchValue("");
              }}
            >
              <SelectTrigger
                id="local_field_id"
                aria-required="true"
                aria-invalid={ariaInvalid("local_field_id")}
                aria-describedby={describedBy("local_field_id")}
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
        </CardContent>
      </Card>

      {clubTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("create.sectionsTitle")}</CardTitle>
            <CardDescription>{t("create.sectionsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {clubTypes.map((clubType, index) => {
              const checkboxId = `section_club_type_id_${index}`;
              return (
                <div
                  key={clubType.value}
                  className="space-y-3 rounded-md border border-border/60 p-4"
                >
                  <div className="flex items-start gap-3">
                    <input
                      id={checkboxId}
                      name={checkboxId}
                      type="checkbox"
                      value={clubType.value}
                      className="mt-1 size-4 rounded border-input text-primary"
                    />
                    <div className="space-y-1">
                      <Label htmlFor={checkboxId}>{clubType.label}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t("create.sectionToggleHint")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`section_name_${index}`}>
                      {t("create.sectionNameLabel")}
                    </Label>
                    <Input
                      id={`section_name_${index}`}
                      name={`section_name_${index}`}
                      placeholder={t("create.sectionNamePlaceholder", {
                        section: clubType.label,
                      })}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.coordinatesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LocationPicker apiKey={googleMapsApiKey} />
          {fieldErrors.coordinates && (
            <p
              id="coordinates-error"
              role="alert"
              className="mt-2 text-xs text-destructive"
            >
              {fieldErrors.coordinates}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
