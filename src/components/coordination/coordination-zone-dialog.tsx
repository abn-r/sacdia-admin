"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
import { Textarea } from "@/components/ui/textarea";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createCoordinationZone,
  extractCoordinationConflictReason,
} from "@/lib/api/coordination";
import { coordinationErrorMessage } from "@/components/coordination/coordination-labels";

type CoordinationZoneDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localFieldId: number;
  localFieldName: string;
  onCreated: () => Promise<void>;
};

export function CoordinationZoneDialog({
  open,
  onOpenChange,
  localFieldId,
  localFieldName,
  onCreated,
}: CoordinationZoneDialogProps) {
  const t = useTranslations("coordinationAdmin");
  const tc = useTranslations("people.community.coordination");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (saving) return;
    if (!next) {
      setName("");
      setDescription("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError(t("errors.zoneNameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createCoordinationZone(localFieldId, {
        name: trimmed,
        description: description.trim() || undefined,
      });
      toast.success(t("success.zoneCreated"));
      setName("");
      setDescription("");
      onOpenChange(false);
      await onCreated();
    } catch (err) {
      setError(
        coordinationErrorMessage(
          extractCoordinationConflictReason(err),
          getActionErrorMessage(err, t("errors.generic")),
          t as unknown as (key: string) => string,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{tc("zoneDialog.title")}</DialogTitle>
            <DialogDescription>{localFieldName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="zone-name">{t("fields.name")}</Label>
            <Input
              id="zone-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("zones.namePlaceholder")}
              aria-invalid={error ? true : undefined}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zone-description">{t("fields.description")}</Label>
            <Textarea
              id="zone-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("zones.descriptionPlaceholder")}
              rows={3}
            />
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => handleOpenChange(false)}
            >
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" loading={saving}>
              {tc("zoneDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
