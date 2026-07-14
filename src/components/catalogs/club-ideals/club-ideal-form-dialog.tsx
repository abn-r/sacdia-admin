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
import { Textarea } from "@/components/ui/textarea";
import {
  createClubIdealAction,
  updateClubIdealAction,
  type ClubIdealActionState,
} from "@/lib/catalogs/club-ideals/actions";
import type { AdminClubIdealRow } from "@/lib/catalogs/club-ideals/types";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";

type ClubIdealFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  clubIdeal?: AdminClubIdealRow | null;
  clubTypes: AdminClubType[];
};

const initialState: ClubIdealActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function ClubIdealFormDialog({
  open,
  onOpenChange,
  mode,
  clubIdeal,
  clubTypes,
}: ClubIdealFormDialogProps) {
  const t = useTranslations("catalogs");
  const tFields = useTranslations("catalogs.fields");
  const entity = t("entities.club-ideals.singular");

  const action = mode === "create" ? createClubIdealAction : updateClubIdealAction;
  const [state, formAction] = useActionState(action, initialState);
  const [active, setActive] = useState(true);
  const [clubTypeId, setClubTypeId] = useState("");

  useEffect(() => {
    if (open) {
      setActive(clubIdeal?.active ?? true);
      setClubTypeId(clubIdeal?.club_type_id ? String(clubIdeal.club_type_id) : "");
    }
  }, [open, clubIdeal]);

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
      : t("actions.edit", { entity: clubIdeal?.name ?? entity });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("entities.club-ideals.description")}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {mode === "edit" && clubIdeal ? (
            <input type="hidden" name="club_ideal_id" value={clubIdeal.club_ideal_id} />
          ) : (
            <input type="hidden" name="club_type_id" value={clubTypeId} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="club-ideal-name">{tFields("name")}</Label>
              <Input
                id="club-ideal-name"
                name="name"
                defaultValue={clubIdeal?.name ?? ""}
                required
                maxLength={50}
              />
            </div>

            {mode === "create" ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>{tFields("club_type")}</Label>
                <Select value={clubTypeId} onValueChange={setClubTypeId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={tFields("club_type")} />
                  </SelectTrigger>
                  <SelectContent>
                    {clubTypes.map((clubType) => (
                      <SelectItem
                        key={clubType.club_type_id}
                        value={String(clubType.club_type_id)}
                      >
                        {clubType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2 sm:col-span-2">
                <Label>{tFields("club_type")}</Label>
                <Input value={clubIdeal?.club_type_name ?? ""} disabled />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="club-ideal-order">{tFields("ideal_order")}</Label>
              <Input
                id="club-ideal-order"
                name="ideal_order"
                type="number"
                min="1"
                defaultValue={clubIdeal?.ideal_order ?? 1}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="club-ideal-active">{tFields("active")}</Label>
              <div className="flex h-9 items-center">
                <Switch id="club-ideal-active" checked={active} onCheckedChange={setActive} />
                <input type="hidden" name="active" value={active ? "true" : "false"} />
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="club-ideal-text">{tFields("ideal")}</Label>
              <Textarea
                id="club-ideal-text"
                name="ideal"
                defaultValue={clubIdeal?.ideal ?? ""}
                rows={4}
              />
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
