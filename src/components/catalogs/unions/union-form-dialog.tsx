"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
  createUnionAction,
  updateUnionAction,
  type UnionActionState,
} from "@/lib/catalogs/unions/actions";
import type { AdminCountry } from "@/lib/catalogs/countries/types";
import type { AdminDivision } from "@/lib/catalogs/divisions/types";
import type { AdminUnionRow } from "@/lib/catalogs/unions/types";

type UnionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  union?: AdminUnionRow | null;
  countries: AdminCountry[];
  divisions: AdminDivision[];
};

const initialState: UnionActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function UnionFormDialog({
  open,
  onOpenChange,
  mode,
  union,
  countries,
  divisions,
}: UnionFormDialogProps) {
  const t = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("entities.unions.singular");

  const action = mode === "create" ? createUnionAction : updateUnionAction;
  const [state, formAction] = useActionState(action, initialState);
  const [active, setActive] = useState(true);
  const [countryId, setCountryId] = useState("");
  const [divisionId, setDivisionId] = useState("");

  useEffect(() => {
    if (open) {
      setActive(union?.active ?? true);
      setCountryId(union?.country_id ? String(union.country_id) : "");
      setDivisionId(union?.division_id ? String(union.division_id) : "");
    }
  }, [open, union]);

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
      : t("actions.edit", { entity: union?.name ?? entity });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("entities.unions.description")}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && union ? (
            <input type="hidden" name="union_id" value={union.union_id} />
          ) : null}
          <input type="hidden" name="country_id" value={countryId} />
          <input type="hidden" name="division_id" value={divisionId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="union-name">{tFields("name")}</Label>
              <Input
                id="union-name"
                name="name"
                defaultValue={union?.name ?? ""}
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="union-abbreviation">{tFields("abbreviation")}</Label>
              <Input
                id="union-abbreviation"
                name="abbreviation"
                defaultValue={union?.abbreviation ?? ""}
                required
                maxLength={8}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="union-active">{tFields("active")}</Label>
              <div className="flex h-9 items-center">
                <Switch id="union-active" checked={active} onCheckedChange={setActive} />
                <input type="hidden" name="active" value={active ? "true" : "false"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{tFields("country")}</Label>
              <Select value={countryId} onValueChange={setCountryId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tFields("country")} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.country_id} value={String(country.country_id)}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("entities.divisions.title")}</Label>
              <Select value={divisionId} onValueChange={setDivisionId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("entities.divisions.title")} />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((division) => (
                    <SelectItem key={division.division_id} value={String(division.division_id)}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
