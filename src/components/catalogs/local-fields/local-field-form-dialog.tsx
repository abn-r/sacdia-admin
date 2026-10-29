"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
  createLocalFieldAction,
  updateLocalFieldAction,
  type LocalFieldActionState,
} from "@/lib/catalogs/local-fields/actions";
import {
  DEFAULT_LOCAL_FIELD_TIMEZONE,
  localFieldTimezoneOptions,
} from "@/lib/catalogs/local-fields/timezones";
import type { AdminLocalFieldRow } from "@/lib/catalogs/local-fields/types";
import type { AdminUnion } from "@/lib/catalogs/unions/types";

type LocalFieldFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  localField?: AdminLocalFieldRow | null;
  unions: AdminUnion[];
};

const initialState: LocalFieldActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button loading={pending} type="submit">
      {label}
    </Button>
  );
}

export function LocalFieldFormDialog({
  open,
  onOpenChange,
  mode,
  localField,
  unions,
}: LocalFieldFormDialogProps) {
  const t = useTranslations("catalogs.entities.local-fields");
  const tCatalogs = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("singular");

  const action = mode === "create" ? createLocalFieldAction : updateLocalFieldAction;
  const { state, formAction, values, discard } = useRetainedActionState(action, initialState);
  const [active, setActive] = useState(true);
  const [unionId, setUnionId] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_LOCAL_FIELD_TIMEZONE);

  useEffect(() => {
    if (open) {
      discard();
      setActive(localField?.active ?? true);
      setUnionId(localField?.union_id ? String(localField.union_id) : "");
      // A field without a zone opens with the default so saving fixes it.
      setTimezone(localField?.timezone ?? DEFAULT_LOCAL_FIELD_TIMEZONE);
    }
  }, [open, localField, discard]);

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
      : tCatalogs("actions.edit", { entity: localField?.name ?? entity });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && localField ? (
            <input type="hidden" name="local_field_id" value={localField.local_field_id} />
          ) : null}
          <input type="hidden" name="union_id" value={unionId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="local-field-name">{tFields("name")}</Label>
              <Input
                id="local-field-name"
                name="name"
                defaultValue={retainedValue(values, "name", localField?.name ?? "")}
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="local-field-abbreviation">{tFields("abbreviation")}</Label>
              <Input
                id="local-field-abbreviation"
                name="abbreviation"
                defaultValue={retainedValue(values, "abbreviation", localField?.abbreviation ?? "")}
                required
                maxLength={8}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="local-field-active">{tFields("active")}</Label>
              <div className="flex h-9 items-center">
                <Switch id="local-field-active" checked={active} onCheckedChange={setActive} />
                <input type="hidden" name="active" value={active ? "true" : "false"} />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="local-field-union">{tFields("union")}</Label>
              <Select value={unionId} onValueChange={setUnionId} required>
                <SelectTrigger id="local-field-union" className="w-full">
                  <SelectValue placeholder={tFields("union")} />
                </SelectTrigger>
                <SelectContent>
                  {unions.map((union) => (
                    <SelectItem key={union.union_id} value={String(union.union_id)}>
                      {union.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="local-field-timezone">{tFields("timezone")}</Label>
              <input type="hidden" name="timezone" value={timezone} />
              <Select value={timezone} onValueChange={setTimezone} required>
                <SelectTrigger id="local-field-timezone" className="w-full">
                  <SelectValue placeholder={tFields("timezone")} />
                </SelectTrigger>
                <SelectContent>
                  {localFieldTimezoneOptions(localField?.timezone).map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{tFields("timezoneHelp")}</p>
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
