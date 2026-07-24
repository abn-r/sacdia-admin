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
import { Switch } from "@/components/ui/switch";
import {
  createClubTypeAction,
  updateClubTypeAction,
  type ClubTypeActionState,
} from "@/lib/catalogs/club-types/actions";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";

type ClubTypeFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  clubType?: AdminClubType | null;
};

const initialState: ClubTypeActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function ClubTypeFormDialog({
  open,
  onOpenChange,
  mode,
  clubType,
}: ClubTypeFormDialogProps) {
  const t = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("entities.club-types.singular");

  const action = mode === "create" ? createClubTypeAction : updateClubTypeAction;
  const [state, formAction] = useActionState(action, initialState);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open) setActive(clubType?.active ?? true);
  }, [open, clubType]);

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
      : t("actions.edit", { entity: clubType?.name ?? entity });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("entities.club-types.description")}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && clubType ? (
            <input type="hidden" name="club_type_id" value={clubType.club_type_id} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="club-type-name">{tFields("name")}</Label>
              <Input
                id="club-type-name"
                name="name"
                defaultValue={clubType?.name ?? ""}
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="club-type-active">{tFields("active")}</Label>
              <div className="flex h-9 items-center">
                <Switch id="club-type-active" checked={active} onCheckedChange={setActive} />
                <input type="hidden" name="active" value={active ? "true" : "false"} />
              </div>
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
