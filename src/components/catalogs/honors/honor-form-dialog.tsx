"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { TranslationsTabsField } from "@/components/catalogs/translations-tabs-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createHonorAction,
  updateHonorAction,
  type HonorActionState,
} from "@/lib/catalogs/honors/actions";
import type { AdminHonorCategoryRow } from "@/lib/catalogs/honor-categories/types";
import type { AdminHonorRow } from "@/lib/catalogs/honors/types";
import type { AdminClubType } from "@/lib/api/admin-club-types";
import { CATALOG_LOCALES } from "@/lib/types/catalog-translation";

type HonorFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  honor?: AdminHonorRow | null;
  categories: AdminHonorCategoryRow[];
  clubTypes: AdminClubType[];
};

const initialState: HonorActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function buildTranslationMaps(honor?: AdminHonorRow | null) {
  const names: Record<string, string> = {};
  const descriptions: Record<string, string> = {};
  for (const locale of CATALOG_LOCALES) {
    const match = honor?.translations.find((row) => row.locale === locale);
    names[locale] = match?.name ?? "";
    descriptions[locale] = match?.description ?? "";
  }
  return { names, descriptions };
}

export function HonorFormDialog({
  open,
  onOpenChange,
  mode,
  honor,
  categories,
  clubTypes,
}: HonorFormDialogProps) {
  const t = useTranslations("catalogs.entities.honors");
  const tCatalogs = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("singular");

  const action = mode === "create" ? createHonorAction : updateHonorAction;
  const [state, formAction] = useActionState(action, initialState);
  const [active, setActive] = useState(true);
  const [honorsCategoryId, setHonorsCategoryId] = useState("");
  const [clubTypeId, setClubTypeId] = useState("");
  const [approval, setApproval] = useState("1");
  const [skillLevel, setSkillLevel] = useState("1");
  const [translationValues, setTranslationValues] = useState<Record<string, string>>({});
  const [translationDescriptions, setTranslationDescriptions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const maps = buildTranslationMaps(honor);
      setTranslationValues(maps.names);
      setTranslationDescriptions(maps.descriptions);
      setActive(honor?.active ?? true);
      setHonorsCategoryId(honor?.honors_category_id ? String(honor.honors_category_id) : "");
      setClubTypeId(honor?.club_type_id ? String(honor.club_type_id) : "");
      setApproval(honor?.approval ? String(honor.approval) : "1");
      setSkillLevel(honor?.skill_level ? String(honor.skill_level) : "1");
    }
  }, [open, honor]);

  useEffect(() => {
    if (state.ok) {
      toast.success(
        mode === "create"
          ? tCatalogs("success.op_create_title")
          : tCatalogs("success.op_update_title"),
        {
          description:
            mode === "create"
              ? tCatalogs("success.op_create_description")
              : tCatalogs("success.op_update_description"),
        },
      );
      onOpenChange(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [mode, onOpenChange, state, tCatalogs]);

  const title =
    mode === "create"
      ? tCatalogs("actions.create", { entity })
      : tCatalogs("actions.edit", { entity: honor?.name ?? entity });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && honor ? (
            <input type="hidden" name="honor_id" value={honor.honor_id} />
          ) : null}
          <input type="hidden" name="honors_category_id" value={honorsCategoryId} />
          <input type="hidden" name="club_type_id" value={clubTypeId} />
          <input type="hidden" name="approval" value={approval} />
          <input type="hidden" name="skill_level" value={skillLevel} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="honor-name">{tFields("name")}</Label>
              <Input
                id="honor-name"
                name="name"
                defaultValue={honor?.name ?? ""}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="honor-description">{tFields("description")}</Label>
              <Textarea
                id="honor-description"
                name="description"
                defaultValue={honor?.description ?? ""}
                className="min-h-[80px] resize-none"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="honor-image">{tFields("honor_image")}</Label>
              <Input
                id="honor-image"
                name="honor_image"
                defaultValue={honor?.honor_image ?? ""}
                required
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="honor-material">{tFields("material_url")}</Label>
              <Input
                id="honor-material"
                name="material_url"
                defaultValue={honor?.material_url ?? ""}
                required
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>{tFields("honor_category")}</Label>
              <Select value={honorsCategoryId} onValueChange={setHonorsCategoryId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tFields("honor_category")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.honor_category_id}
                      value={String(category.honor_category_id)}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tFields("club_type")}</Label>
              <Select value={clubTypeId} onValueChange={setClubTypeId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tFields("club_type")} />
                </SelectTrigger>
                <SelectContent>
                  {clubTypes.map((clubType) => (
                    <SelectItem key={clubType.club_type_id} value={String(clubType.club_type_id)}>
                      {clubType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tFields("approval")}</Label>
              <Select value={approval} onValueChange={setApproval}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tFields("skill_level")}</Label>
              <Select value={skillLevel} onValueChange={setSkillLevel}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="honor-year">{tFields("year")}</Label>
              <Input id="honor-year" name="year" defaultValue={honor?.year ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="honor-active">{tFields("active")}</Label>
              <div className="flex h-9 items-center">
                <Switch id="honor-active" checked={active} onCheckedChange={setActive} />
                <input type="hidden" name="active" value={active ? "true" : "false"} />
              </div>
            </div>
          </div>

          <TranslationsTabsField
            values={translationValues}
            onChange={(locale, value) =>
              setTranslationValues((current) => ({ ...current, [locale]: value }))
            }
            descriptionValues={translationDescriptions}
            onDescriptionChange={(locale, value) =>
              setTranslationDescriptions((current) => ({ ...current, [locale]: value }))
            }
            includeDescription
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCatalogs("deleteDialog.cancel")}
            </Button>
            <SubmitButton
              label={
                mode === "create"
                  ? tCatalogs("actions.create", { entity })
                  : tCatalogs("crudPage.edit")
              }
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
