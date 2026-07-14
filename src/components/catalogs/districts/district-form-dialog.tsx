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
  createDistrictAction,
  updateDistrictAction,
  type DistrictActionState,
} from "@/lib/catalogs/districts/actions";
import type { AdminDistrictRow } from "@/lib/catalogs/districts/types";
import type { AdminLocalField } from "@/lib/catalogs/local-fields/types";

type DistrictFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  district?: AdminDistrictRow | null;
  localFields: AdminLocalField[];
};

const initialState: DistrictActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function DistrictFormDialog({
  open,
  onOpenChange,
  mode,
  district,
  localFields,
}: DistrictFormDialogProps) {
  const t = useTranslations("catalogs.entities.districts");
  const tCatalogs = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("singular");

  const action = mode === "create" ? createDistrictAction : updateDistrictAction;
  const [state, formAction] = useActionState(action, initialState);
  const [active, setActive] = useState(true);
  const [localFieldId, setLocalFieldId] = useState("");

  useEffect(() => {
    if (open) {
      setActive(district?.active ?? true);
      setLocalFieldId(district?.local_field_id ? String(district.local_field_id) : "");
    }
  }, [open, district]);

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
      : tCatalogs("actions.edit", { entity: district?.name ?? entity });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && district ? (
            <input type="hidden" name="district_id" value={district.district_id} />
          ) : null}
          <input type="hidden" name="local_field_id" value={localFieldId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="district-name">{tFields("name")}</Label>
              <Input
                id="district-name"
                name="name"
                defaultValue={district?.name ?? ""}
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district-active">{tFields("active")}</Label>
              <div className="flex h-9 items-center">
                <Switch id="district-active" checked={active} onCheckedChange={setActive} />
                <input type="hidden" name="active" value={active ? "true" : "false"} />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{tFields("local_field")}</Label>
              <Select value={localFieldId} onValueChange={setLocalFieldId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tFields("local_field")} />
                </SelectTrigger>
                <SelectContent>
                  {localFields.map((localField) => (
                    <SelectItem
                      key={localField.local_field_id}
                      value={String(localField.local_field_id)}
                    >
                      {localField.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
