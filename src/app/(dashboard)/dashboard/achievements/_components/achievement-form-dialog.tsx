"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CriteriaEditor } from "@/app/(dashboard)/dashboard/achievements/_components/criteria-editor";
import { BadgeImageUpload } from "@/app/(dashboard)/dashboard/achievements/_components/badge-image-upload";
import { AchievementPreviewCard } from "@/app/(dashboard)/dashboard/achievements/_components/achievement-preview-card";
import type {
  AchievementType,
  AchievementTier,
  AchievementScope,
  AchievementCriteria,
} from "@/lib/api/achievements";
import type { AchievementActionState } from "@/lib/achievements/actions";

type AchievementRecord = Record<string, unknown>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  achievement?: AchievementRecord | null;
  categoryId?: number | null;
  categories?: { id: number; name: string }[];
  allAchievements?: { id: number; name: string }[];
  formAction: (
    prevState: AchievementActionState,
    formData: FormData,
  ) => Promise<AchievementActionState>;
  actionState: AchievementActionState;
}

const ACHIEVEMENT_TYPES: { value: AchievementType; label: string }[] = [
  { value: "THRESHOLD", label: "Umbral" },
  { value: "STREAK", label: "Racha" },
  { value: "COMPOUND", label: "Compuesto" },
  { value: "MILESTONE", label: "Hito" },
  { value: "COLLECTION", label: "Colección" },
];

const ACHIEVEMENT_TIERS: { value: AchievementTier; label: string; color: string }[] = [
  { value: "BRONZE", label: "Bronce", color: "#CD7F32" },
  { value: "SILVER", label: "Plata", color: "#C0C0C0" },
  { value: "GOLD", label: "Oro", color: "#FFD700" },
  { value: "PLATINUM", label: "Platino", color: "#E5E4E2" },
  { value: "DIAMOND", label: "Diamante", color: "#B9F2FF" },
];

const ACHIEVEMENT_SCOPES: { value: AchievementScope; label: string }[] = [
  { value: "GLOBAL",              label: "Global" },
  { value: "CLUB_TYPE",           label: "Tipo de club" },
  { value: "ECCLESIASTICAL_YEAR", label: "Año eclesiástico" },
];

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseCriteria(value: unknown): AchievementCriteria | null {
  if (!value) return null;
  if (typeof value === "object") return value as AchievementCriteria;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as AchievementCriteria;
    } catch {
      return null;
    }
  }
  return null;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function AchievementFormDialog({
  open,
  onOpenChange,
  mode,
  achievement,
  categoryId,
  categories = [],
  allAchievements = [],
  formAction,
  actionState,
}: Props) {
  const isEdit = mode === "edit";

  const achievementId = isEdit && achievement
    ? toPositiveNumber(achievement.achievement_id ?? achievement.id)
    : null;

  // Form state for controlled fields
  const [name, setName] = useState(toText(achievement?.name));
  const [description, setDescription] = useState(toText(achievement?.description));
  const [type, setType] = useState<AchievementType>(
    (toText(achievement?.type) as AchievementType) || "THRESHOLD",
  );
  const [tier, setTier] = useState<AchievementTier>(
    (toText(achievement?.tier) as AchievementTier) || "BRONZE",
  );
  const [scope, setScope] = useState<AchievementScope>(
    (toText(achievement?.scope) as AchievementScope) || "GLOBAL",
  );
  const [points, setPoints] = useState(
    toPositiveNumber(achievement?.points) ?? 10,
  );
  const [secret, setSecret] = useState(achievement?.secret === true);
  const [repeatable, setRepeatable] = useState(achievement?.repeatable === true);
  const [maxRepeats, setMaxRepeats] = useState(
    toPositiveNumber(achievement?.max_repeats) ?? 1,
  );
  const [active, setActive] = useState(achievement ? achievement.active !== false : true);
  const [badgeImageUrl, setBadgeImageUrl] = useState(toText(achievement?.badge_image_url));
  const [criteria, setCriteria] = useState<AchievementCriteria | null>(
    parseCriteria(achievement?.criteria),
  );

  const selectedCategoryId =
    toPositiveNumber(achievement?.category_id) ?? categoryId ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar logro" : "Nuevo logro"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del logro."
              : "Completa los campos para crear un nuevo logro."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {/* Hidden fields */}
          {isEdit && achievementId !== null && (
            <input type="hidden" name="id" value={String(achievementId)} />
          )}
          {selectedCategoryId !== null && (
            <input type="hidden" name="category_id" value={String(selectedCategoryId)} />
          )}
          <input type="hidden" name="active" value={active ? "on" : ""} />
          <input type="hidden" name="secret" value={secret ? "on" : ""} />
          <input type="hidden" name="repeatable" value={repeatable ? "on" : ""} />

          {actionState.error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
              {actionState.error}
            </p>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">
                Información básica
              </TabsTrigger>
              <TabsTrigger value="criteria" className="flex-1">
                Criterios
              </TabsTrigger>
              <TabsTrigger value="media" className="flex-1">
                Imagen
              </TabsTrigger>
            </TabsList>

            {/* ── Tab: Basic Info ── */}
            <TabsContent value="basic" className="mt-4 space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="ach-name">
                  Nombre <span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="ach-name"
                  name="name"
                  placeholder="Ej. Asistente Dedicado"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="ach-description">Descripción</Label>
                <Textarea
                  id="ach-description"
                  name="description"
                  rows={2}
                  placeholder="Describe este logro..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[70px] resize-none"
                />
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="ach-category">Categoría</Label>
                  <Select
                    name="category_id"
                    defaultValue={selectedCategoryId ? String(selectedCategoryId) : undefined}
                  >
                    <SelectTrigger id="ach-category">
                      <SelectValue placeholder="Selecciona una categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="ach-type">
                  Tipo <span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Select
                  name="type"
                  value={type}
                  onValueChange={(v) => setType(v as AchievementType)}
                  required
                >
                  <SelectTrigger id="ach-type">
                    <SelectValue placeholder="Tipo de logro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACHIEVEMENT_TYPES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tier + Points */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ach-tier">
                    Nivel <span className="ml-0.5 text-destructive">*</span>
                  </Label>
                  <Select
                    name="tier"
                    value={tier}
                    onValueChange={(v) => setTier(v as AchievementTier)}
                    required
                  >
                    <SelectTrigger id="ach-tier">
                      <SelectValue placeholder="Nivel..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ACHIEVEMENT_TIERS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block size-3 rounded-full"
                              style={{ backgroundColor: opt.color }}
                              aria-hidden
                            />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ach-points">
                    Puntos <span className="ml-0.5 text-destructive">*</span>
                  </Label>
                  <Input
                    id="ach-points"
                    name="points"
                    type="number"
                    min={1}
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* Scope */}
              <div className="space-y-2">
                <Label htmlFor="ach-scope">
                  Alcance <span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Select
                  name="scope"
                  value={scope}
                  onValueChange={(v) => setScope(v as AchievementScope)}
                  required
                >
                  <SelectTrigger id="ach-scope">
                    <SelectValue placeholder="Alcance..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACHIEVEMENT_SCOPES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prerequisite */}
              {allAchievements.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="ach-prerequisite">Prerequisito</Label>
                  <Select
                    name="prerequisite_id"
                    defaultValue={
                      toPositiveNumber(achievement?.prerequisite_id)
                        ? String(toPositiveNumber(achievement?.prerequisite_id))
                        : undefined
                    }
                  >
                    <SelectTrigger id="ach-prerequisite">
                      <SelectValue placeholder="Sin prerequisito..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allAchievements
                        .filter((a) => a.id !== achievementId)
                        .map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Flags row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Switch id="ach-secret" checked={secret} onCheckedChange={setSecret} />
                  <Label htmlFor="ach-secret" className="cursor-pointer">
                    Logro secreto
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <Switch id="ach-active" checked={active} onCheckedChange={setActive} />
                  <Label htmlFor="ach-active" className="cursor-pointer">
                    Activo
                  </Label>
                </div>
              </div>

              {/* Repeatable */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch
                    id="ach-repeatable"
                    checked={repeatable}
                    onCheckedChange={setRepeatable}
                  />
                  <Label htmlFor="ach-repeatable" className="cursor-pointer">
                    Logro repetible
                  </Label>
                </div>
                {repeatable && (
                  <div className="space-y-2 pl-9">
                    <Label htmlFor="ach-max-repeats">Máximo de repeticiones</Label>
                    <Input
                      id="ach-max-repeats"
                      name="max_repeats"
                      type="number"
                      min={1}
                      className="max-w-[120px]"
                      value={maxRepeats}
                      onChange={(e) => setMaxRepeats(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>

              {/* Live preview */}
              <div className="pt-2">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Vista previa
                </p>
                <AchievementPreviewCard
                  name={name || "Nombre del logro"}
                  description={description}
                  tier={tier}
                  type={type}
                  points={points}
                  secret={secret}
                  repeatable={repeatable}
                  badgeImageUrl={badgeImageUrl || null}
                />
              </div>
            </TabsContent>

            {/* ── Tab: Criteria ── */}
            <TabsContent value="criteria" className="mt-4">
              <CriteriaEditor
                type={type}
                initialValue={criteria}
                onChange={setCriteria}
              />
              {!criteria && (
                <input type="hidden" name="criteria" value="{}" />
              )}
            </TabsContent>

            {/* ── Tab: Media ── */}
            <TabsContent value="media" className="mt-4">
              <BadgeImageUpload
                achievementId={achievementId}
                currentImageUrl={badgeImageUrl || null}
                tier={tier}
                onUploaded={(url) => setBadgeImageUrl(url)}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <SubmitButton label={isEdit ? "Guardar cambios" : "Crear logro"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
