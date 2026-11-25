"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { TranslationsTabsField } from "@/components/forms/translations-tabs-field";
import { retainedValue, useRetainedActionState } from "@/hooks/use-retained-action-state";
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
import type { CatalogTranslation } from "@/lib/types/catalog-translation";
import { toCatalogTranslations } from "@/lib/catalogs/translations";

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
    <Button loading={pending} type="submit">
      {label}
    </Button>
  );
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
  const { state, formAction, values, discard } = useRetainedActionState(action, initialState);
  const [translations, setTranslations] = useState<CatalogTranslation[]>([]);
  const [active, setActive] = useState(true);
  const [districtId, setDistrictId] = useState("");

  useEffect(() => {
    if (open) {
      discard();
      setTranslations(toCatalogTranslations(church?.translations));
      setActive(church?.active ?? true);
      setDistrictId(church?.district_id ? String(church.district_id) : "");
    }
  }, [open, church, discard]);

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

          <TranslationsTabsField
            esContent={
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="church-name">{tFields("name")}</Label>
                    <Input
                      id="church-name"
                      name="name"
                      defaultValue={retainedValue(values, "name", church?.name ?? "")}
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
                    <Label htmlFor="church-district">{tFields("district")}</Label>
                    <Select value={districtId} onValueChange={setDistrictId} required>
                      <SelectTrigger id="church-district" className="w-full">
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
            }
            translations={translations}
            onTranslationsChange={setTranslations}
            legacyFieldNames
            includeDescription={false}
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
