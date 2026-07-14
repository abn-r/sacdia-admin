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
import { Switch } from "@/components/ui/switch";
import {
  createDivisionAction,
  updateDivisionAction,
  type DivisionActionState,
} from "@/lib/catalogs/divisions/actions";
import type { AdminDivision } from "@/lib/catalogs/divisions/types";
import { CATALOG_LOCALES } from "@/lib/types/catalog-translation";

type DivisionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  division?: AdminDivision | null;
};

const initialState: DivisionActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function buildTranslationMap(division?: AdminDivision | null) {
  const map: Record<string, string> = {};
  for (const locale of CATALOG_LOCALES) {
    const match = division?.translations.find((row) => row.locale === locale);
    map[locale] = match?.name ?? "";
  }
  return map;
}

export function DivisionFormDialog({ open, onOpenChange, mode, division }: DivisionFormDialogProps) {
  const t = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("entities.divisions.singular");

  const action = mode === "create" ? createDivisionAction : updateDivisionAction;
  const [state, formAction] = useActionState(action, initialState);
  const [translationValues, setTranslationValues] = useState<Record<string, string>>({});
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open) {
      setTranslationValues(buildTranslationMap(division));
      setActive(division?.active ?? true);
    }
  }, [open, division]);

  useEffect(() => {
    if (state.ok) {
      toast.success(
        mode === "create" ? t("success.op_create_title") : t("success.op_update_title"),
        {
          description:
            mode === "create"
              ? t("success.op_create_description")
              : t("success.op_update_description"),
        },
      );
      onOpenChange(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [mode, onOpenChange, state, t]);

  const title =
    mode === "create"
      ? t("actions.create", { entity })
      : t("actions.edit", { entity: division?.name ?? entity });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("entities.divisions.description")}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && division ? (
            <input type="hidden" name="division_id" value={division.division_id} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="division-code">{tFields("code")}</Label>
              <Input
                id="division-code"
                name="code"
                defaultValue={division?.code ?? ""}
                required
                maxLength={50}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="division-name">{tFields("name")}</Label>
              <Input
                id="division-name"
                name="name"
                defaultValue={division?.name ?? ""}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="division-abbreviation">{tFields("abbreviation")}</Label>
              <Input
                id="division-abbreviation"
                name="abbreviation"
                defaultValue={division?.abbreviation ?? ""}
                required
                maxLength={16}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="division-active">{tFields("active")}</Label>
              <div className="flex h-9 items-center">
                <Switch id="division-active" checked={active} onCheckedChange={setActive} />
                <input type="hidden" name="active" value={active ? "true" : "false"} />
              </div>
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
              {t("deleteDialog.cancel")}
            </Button>
            <SubmitButton
              label={mode === "create" ? t("actions.create", { entity }) : t("crudPage.edit")}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
