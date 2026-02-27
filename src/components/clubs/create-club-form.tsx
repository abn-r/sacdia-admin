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
import type { ClubActionState } from "@/lib/clubs/actions";

type SelectOption = { label: string; value: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      Crear club
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

  return (
    <form action={action} className="space-y-6">
      {state.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del club</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input id="name" name="name" placeholder="Nombre del club" required />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" placeholder="Descripción opcional" rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="local_field_id">
              Campo local <span className="text-destructive">*</span>
            </Label>
            <Select name="local_field_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar campo local" />
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
              Distrito <span className="text-destructive">*</span>
            </Label>
            <Select name="district_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar distrito" />
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
              Iglesia <span className="text-destructive">*</span>
            </Label>
            <Select name="church_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar iglesia" />
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
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" name="address" placeholder="Dirección del club" />
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
            <Input id="coordinates_lat" name="coordinates_lat" type="number" step="any" placeholder="19.4326" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coordinates_lng">Longitud</Label>
            <Input id="coordinates_lng" name="coordinates_lng" type="number" step="any" placeholder="-99.1332" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
