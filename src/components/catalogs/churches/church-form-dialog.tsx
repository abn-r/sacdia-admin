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
import {
  createChurchAction,
  updateChurchAction,
  type ChurchActionState,
} from "@/lib/catalogs/churches/actions";
import type { AdminChurchRow } from "@/lib/catalogs/churches/types";
import type { AdminDistrict } from "@/lib/catalogs/districts/types";
import { CATALOG_LOCALES } from "@/lib/types/catalog-translation";

type ChurchFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  church?: AdminChurchRow | null;
  districts: AdminDistrict[];
};

const initialState: ChurchActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function buildTranslationMap(church?: AdminChurchRow | null) {
  const map: Record<string, string> = {};
  for (const locale of CATALOG_LOCALES) {
    const match = church?.translations.find((row) => row.locale === locale);
    map[locale] = match?.name ?? "";
  }
  return map;
}

export function ChurchFormDialog({
  open,
  onOpenChange,
  mode,
  church,
  districts,
}: ChurchFormDialogProps) {
  const t = useTranslations("catalogs.entities.churches");
  const tCatalogs = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("singular");

  const action = mode === "create" ? createChurchAction : updateChurchAction;
  const [state, formAction] = useActionState(action, initialState);
  const [translationValues, setTranslationValues] = useState<Record<string, string>>({});
  const [active, setActive] = useState(true);
  const [districtId, setDistrictId] = useState("");

  useEffect(() => {
    if (open) {
      setTranslationValues(buildTranslationMap(church));
      setActive(church?.active ?? true);
      setDistrictId(church?.district_id ? String(church.district_id) : "");
    }
  }, [open, church]);

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
      : tCatalogs("actions.edit", { entity: church?.name ?? entity });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && church ? (
            <input type="hidden" name="church_id" value={church.church_id} />
          ) : null}
          <input type="hidden" name="district_id" value={districtId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="church-name">{tFields("name")}</Label>
              <Input
                id="church-name"
                name="name"
                defaultValue={church?.name ?? ""}
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="church-active">{tFields("active")}</Label>
              <div className="flex h-9 items-center">
                <Switch id="church-active" checked={active} onCheckedChange={setActive} />
                <input type="hidden" name="active" value={active ? "true" : "false"} />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{tFields("district")}</Label>
              <Select value={districtId} onValueChange={setDistrictId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tFields("district")} />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district) => (
                    <SelectItem key={district.district_id} value={String(district.district_id)}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TranslationsTabsField
            values={translationValues}
            onChange={(locale, value) =>
              setTranslationValues((current) => ({ ...current, [locale]: value }))
            }
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
