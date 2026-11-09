"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import {
  FormModalBody,
  FormModalFooter,
  useFormModal,
} from "@/components/shared/form-modal";
import { Input } from "@/components/ui/input";
import { LocationPicker } from "@/components/shared/location-picker";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ClubActionState } from "@/lib/clubs/actions";
import type { EditClubFormData } from "@/lib/clubs/edit-club-form-data";

const LIST_HREF = "/dashboard/clubs";
const initialState: ClubActionState = {};

type EditClubFormProps = EditClubFormData & {
  /** `updateClubAction` with the club id already bound. */
  formAction: (prev: ClubActionState, formData: FormData) => Promise<ClubActionState>;
};

export function EditClubForm({
  name,
  description,
  address,
  active: initialActive,
  lat,
  lng,
  localField,
  district,
  church,
  googleMapsApiKey,
  googleMapsMapId,
  formAction,
}: EditClubFormProps) {
  const t = useTranslations("clubs");
  const [state, action] = useActionState(formAction, initialState);
  const modal = useFormModal(LIST_HREF);
  const [active, setActive] = useState(initialActive);
  const hasSavedLocation = lat !== null && lng !== null;

  const fieldErrors = state.fieldErrors ?? {};
  const describedBy = (field: string) => (fieldErrors[field] ? `${field}-error` : undefined);

  // Saved: confirm, then leave the form (back to where it was opened from) and refresh.
  useEffect(() => {
    if (!state.success) return;
    toast.success(state.success);
    modal.complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to each new action result only
  }, [state]);

  const context = [
    { label: t("fields.local_field"), value: localField },
    { label: t("fields.district"), value: district },
    { label: t("fields.church"), value: church },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col" noValidate>
      <FormModalBody>
        <FieldGroup>
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {context.length > 0 ? (
            <dl className="grid gap-x-4 gap-y-2 rounded-md bg-muted/40 px-3 py-2.5 text-sm sm:grid-cols-3">
              {context.map((item) => (
                <div key={item.label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{item.label}</dt>
                  <dd className="truncate font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <Field data-invalid={fieldErrors.name ? true : undefined}>
            <FieldLabel htmlFor="name">
              {t("form.labelName")}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Input
              id="name"
              name="name"
              defaultValue={name}
              maxLength={50}
              placeholder={t("create.placeholderName")}
              required
              aria-required="true"
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={describedBy("name")}
            />
            {fieldErrors.name ? <FieldError id="name-error">{fieldErrors.name}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="description">{t("form.labelDescription")}</FieldLabel>
            <Textarea
              id="description"
              name="description"
              defaultValue={description}
              placeholder={t("create.placeholderDescription")}
              rows={3}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="address">{t("form.labelAddress")}</FieldLabel>
            <Input
              id="address"
              name="address"
              defaultValue={address}
              placeholder={t("create.placeholderAddress")}
            />
          </Field>

          <Field orientation="horizontal">
            {/* The unchecked Radix switch posts nothing; the hidden input always carries the value. */}
            <input type="hidden" name="active" value={active ? "true" : "false"} />
            <Switch id="active" checked={active} onCheckedChange={setActive} />
            <FieldLabel htmlFor="active">{t("edit.labelActive")}</FieldLabel>
          </Field>

          <Field data-invalid={fieldErrors.coordinates ? true : undefined}>
            <FieldLabel>{t("form.coordinatesTitle")}</FieldLabel>
            <LocationPicker
              apiKey={googleMapsApiKey}
              mapsMapId={googleMapsMapId}
              initialLat={lat}
              initialLng={lng}
              // A saved location can be moved but not removed: PATCH /clubs/:id cannot clear it.
              allowClear={!hasSavedLocation}
            />
            {hasSavedLocation ? <FieldDescription>{t("edit.coordinatesHint")}</FieldDescription> : null}
            {fieldErrors.coordinates ? (
              <FieldError id="coordinates-error">{fieldErrors.coordinates}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
      </FormModalBody>

      <FormModalFooter>
        <Button type="button" variant="outline" onClick={modal.close}>
          {t("create.cancel")}
        </Button>
        <FormSubmitButton>{t("edit.submitButton")}</FormSubmitButton>
      </FormModalFooter>
    </form>
  );
}
