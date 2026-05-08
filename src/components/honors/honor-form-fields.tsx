"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SelectOption } from "@/lib/honors/catalogs";

type HonorRecord = Record<string, unknown>;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

interface HonorFormFieldsProps {
  item?: HonorRecord | null;
  categoryOptions: SelectOption[];
  clubTypeOptions: SelectOption[];
}

export function HonorFormFields({ item, categoryOptions, clubTypeOptions }: HonorFormFieldsProps) {
  const currentCategoryId = toPositiveNumber(item?.honors_category_id ?? item?.category_id);
  const currentClubTypeId = toPositiveNumber(item?.club_type_id);
  const currentSkillLevel = toPositiveNumber(item?.skill_level) ?? 1;
  const currentMasterHonor = toPositiveNumber(item?.master_honors);
  const isActive = item ? item.active !== false : true;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la especialidad</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="honor_name">
              Nombre <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Input
              id="honor_name"
              name="name"
              defaultValue={toText(item?.name) ?? ""}
              placeholder="Nombre de la especialidad"
              required
              aria-required="true"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="honor_description">Descripción</Label>
            <Textarea
              id="honor_description"
              name="description"
              rows={3}
              defaultValue={toText(item?.description) ?? ""}
              placeholder="Descripción opcional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="honors_category_id">Categoría</Label>
            <Select
              name="honors_category_id"
              defaultValue={currentCategoryId ? String(currentCategoryId) : undefined}
            >
              <SelectTrigger id="honors_category_id">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="club_type_id">Tipo de club</Label>
            <Select
              name="club_type_id"
              defaultValue={currentClubTypeId ? String(currentClubTypeId) : undefined}
            >
              <SelectTrigger id="club_type_id">
                <SelectValue placeholder="Seleccionar club" />
              </SelectTrigger>
              <SelectContent>
                {clubTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill_level">Nivel</Label>
            <Input
              id="skill_level"
              name="skill_level"
              type="number"
              min={1}
              defaultValue={String(currentSkillLevel)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="master_honors">Master honor</Label>
            <Input
              id="master_honors"
              name="master_honors"
              type="number"
              min={1}
              defaultValue={currentMasterHonor ? String(currentMasterHonor) : ""}
            />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <input type="hidden" name="active" defaultValue={isActive ? "on" : ""} />
            <Checkbox
              id="active"
              defaultChecked={isActive}
              onCheckedChange={(checked) => {
                const hidden = document.querySelector<HTMLInputElement>(
                  'input[type="hidden"][name="active"]',
                );
                if (hidden) {
                  hidden.value = checked ? "on" : "";
                }
              }}
            />
            <Label htmlFor="active">Especialidad activa</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recursos (opcional)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="honor_image">Imagen (URL relativa o archivo)</Label>
            <Input
              id="honor_image"
              name="honor_image"
              defaultValue={toText(item?.honor_image ?? item?.patch_image) ?? ""}
              placeholder="Especialidades/acolchado.png"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="material_url">Material (PDF)</Label>
            <Input
              id="material_url"
              name="material_url"
              defaultValue={toText(item?.material_url ?? item?.material_honor) ?? ""}
              placeholder="Especialidades/Material/acolchado.pdf"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Año</Label>
            <Input
              id="year"
              name="year"
              defaultValue={toText(item?.year) ?? ""}
              placeholder="2026"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
