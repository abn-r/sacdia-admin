"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type SelectOption = { label: string; value: number };

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
  districts: SelectOption[];
  churches: SelectOption[];
  formAction: (prev: ClubActionState, formData: FormData) => Promise<ClubActionState>;
}

const initialState: ClubActionState = {};

export function CreateClubForm({ localFields, districts, churches, formAction }: CreateClubFormProps) {
  const [state, action] = useActionState(formAction, initialState);
  const t = useTranslations("clubs");

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
            />
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
            <Select name="local_field_id" required>
              <SelectTrigger id="local_field_id" aria-required="true">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="district_id">
              {t("fields.district")}{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Select name="district_id" required>
              <SelectTrigger id="district_id" aria-required="true">
                <SelectValue placeholder={t("create.placeholderDistrict")} />
              </SelectTrigger>
              <SelectContent>
                {districts.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="church_id">
              {t("fields.church")}{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Select name="church_id" required>
              <SelectTrigger id="church_id" aria-required="true">
                <SelectValue placeholder={t("create.placeholderChurch")} />
              </SelectTrigger>
              <SelectContent>
                {churches.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.coordinatesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="coordinates_lat">{t("form.labelLatitude")}</Label>
            <Input
              id="coordinates_lat"
              name="coordinates_lat"
              type="number"
              step="any"
              placeholder="19.4326"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coordinates_lng">{t("form.labelLongitude")}</Label>
            <Input
              id="coordinates_lng"
              name="coordinates_lng"
              type="number"
              step="any"
              placeholder="-99.1332"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
