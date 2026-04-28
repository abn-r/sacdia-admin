"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
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

type SelectOption = { label: string; value: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      Guardar cambios
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
}

const initialState: ClubActionState = {};

export function EditClubForm({ club, localFields, districts, churches, formAction }: EditClubFormProps) {
  const [state, action] = useActionState(formAction, initialState);

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
          <CardTitle className="text-base">Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nombre <span className="text-destructive">*</span></Label>
            <Input id="name" name="name" defaultValue={club.name ?? ""} required />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" defaultValue={club.description ?? ""} rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="local_field_id">Campo local</Label>
            <Select name="local_field_id" defaultValue={club.local_field_id ? String(club.local_field_id) : undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {localFields.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="district_id">Distrito</Label>
            <Select name="district_id" defaultValue={club.district_id ? String(club.district_id) : undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {districts.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="church_id">Iglesia</Label>
            <Select name="church_id" defaultValue={club.church_id ? String(club.church_id) : undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {churches.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
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
            <Label htmlFor="active">Club activo</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coordenadas (opcional)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="coordinates_lat">Latitud</Label>
            <Input id="coordinates_lat" name="coordinates_lat" type="number" step="any" defaultValue={lat ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coordinates_lng">Longitud</Label>
            <Input id="coordinates_lng" name="coordinates_lng" type="number" step="any" defaultValue={lng ?? ""} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
