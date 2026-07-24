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
import { Textarea } from "@/components/ui/textarea";
import {
  createHonorCategoryAction,
  updateHonorCategoryAction,
  type HonorCategoryActionState,
} from "@/lib/catalogs/honor-categories/actions";
import type { AdminHonorCategoryRow } from "@/lib/catalogs/honor-categories/types";

type HonorCategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  category?: AdminHonorCategoryRow | null;
};

const initialState: HonorCategoryActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function HonorCategoryFormDialog({
  open,
  onOpenChange,
  mode,
  category,
}: HonorCategoryFormDialogProps) {
  const t = useTranslations("catalogs.entities.honor-categories");
  const tCatalogs = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("singular");

  const action = mode === "create" ? createHonorCategoryAction : updateHonorCategoryAction;
  const [state, formAction] = useActionState(action, initialState);
  const [active, setActive] = useState(true);
  const [translationValues, setTranslationValues] = useState<Record<string, string>>({});
  const [translationDescriptions, setTranslationDescriptions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setActive(category?.active ?? true);
      setTranslationValues({});
      setTranslationDescriptions({});
    }
  }, [open, category]);

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
      : tCatalogs("actions.edit", { entity: category?.name ?? entity });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && category ? (
            <input type="hidden" name="honor_category_id" value={category.honor_category_id} />
          ) : null}

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="honor-category-name">{tFields("name")}</Label>
              <Input
                id="honor-category-name"
                name="name"
                defaultValue={category?.name ?? ""}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="honor-category-description">{tFields("description")}</Label>
              <Textarea
                id="honor-category-description"
                name="description"
                defaultValue={category?.description ?? ""}
                className="min-h-[80px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="honor-category-active">{tFields("active")}</Label>
              <div className="flex h-9 items-center">
                <Switch id="honor-category-active" checked={active} onCheckedChange={setActive} />
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
