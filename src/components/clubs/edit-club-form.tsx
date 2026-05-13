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
import { Checkbox } from "@/components/ui/checkbox";
import type { ClubActionState } from "@/lib/clubs/actions";
import { LocationPicker } from "@/components/shared/location-picker";

type SelectOption = { label: string; value: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("clubs");
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {t("edit.submitButton")}
    </Button>
  );
}

interface EditClubFormProps {
  club: {
    name?: string;
    description?: string | null;
    active?: boolean;
    local_field_id?: number;
    district_id?: number;
    church_id?: number;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    coordinates?: { lat?: number; lng?: number } | null;
  };
  localFields: SelectOption[];
  districts: SelectOption[];
  churches: SelectOption[];
  formAction: (prev: ClubActionState, formData: FormData) => Promise<ClubActionState>;
  googleMapsApiKey: string;
}

const initialState: ClubActionState = {};

export function EditClubForm({
  club,
  localFields,
  districts,
  churches,
  formAction,
  googleMapsApiKey,
}: EditClubFormProps) {
  const [state, action] = useActionState(formAction, initialState);
  const t = useTranslations("clubs");

  const lat = club.coordinates?.lat ?? club.latitude;
  const lng = club.coordinates?.lng ?? club.longitude;

  return (
    <form action={action} className="space-y-6">
      {state.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          {state.success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("edit.cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">{t("form.labelName")} <span className="text-destructive">*</span></Label>
            <Input id="name" name="name" defaultValue={club.name ?? ""} required />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">{t("form.labelDescription")}</Label>
            <Textarea id="description" name="description" defaultValue={club.description ?? ""} rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="local_field_id">{t("fields.local_field")}</Label>
            <Select name="local_field_id" defaultValue={club.local_field_id ? String(club.local_field_id) : undefined}>
              <SelectTrigger>
                <SelectValue placeholder={t("edit.placeholderSelect")} />
              </SelectTrigger>
              <SelectContent>
                {localFields.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="district_id">{t("fields.district")}</Label>
            <Select name="district_id" defaultValue={club.district_id ? String(club.district_id) : undefined}>
              <SelectTrigger>
                <SelectValue placeholder={t("edit.placeholderSelect")} />
              </SelectTrigger>
              <SelectContent>
                {districts.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="church_id">{t("fields.church")}</Label>
            <Select name="church_id" defaultValue={club.church_id ? String(club.church_id) : undefined}>
              <SelectTrigger>
                <SelectValue placeholder={t("edit.placeholderSelect")} />
              </SelectTrigger>
              <SelectContent>
                {churches.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("form.labelAddress")}</Label>
            <Input id="address" name="address" defaultValue={club.address ?? ""} />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <input type="hidden" name="active" value={club.active !== false ? "true" : "false"} />
            <Checkbox
              id="active"
              defaultChecked={club.active !== false}
              onCheckedChange={(checked) => {
                const hidden = document.querySelector('input[name="active"]') as HTMLInputElement;
                if (hidden) hidden.value = checked ? "true" : "false";
              }}
            />
            <Label htmlFor="active">{t("edit.labelActive")}</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.coordinatesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LocationPicker
            apiKey={googleMapsApiKey}
            initialLat={lat ?? null}
            initialLng={lng ?? null}
            initialAddress={club.address ?? null}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
