"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AchievementActionState } from "@/lib/achievements/actions";

type CategoryRecord = Record<string, unknown>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  item?: CategoryRecord | null;
  formAction: (formData: FormData) => void;
  actionState: AchievementActionState;
}

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  mode,
  item,
  formAction,
  actionState,
}: Props) {
  const t = useTranslations("achievements.forms.category");
  const isEdit = mode === "edit";

  const [active, setActive] = useState<boolean>(
    item ? item.active !== false : true,
  );

  const itemId = isEdit && item
    ? (
        typeof item.achievement_category_id === "number"
          ? item.achievement_category_id
          : typeof item.category_id === "number"
            ? item.category_id
            : typeof item.id === "number"
              ? item.id
              : null
      )
    : null;

  const displayOrder = toPositiveNumber(item?.display_order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("titleEdit") : t("titleCreate")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("descriptionEdit") : t("descriptionCreate")}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4 py-2">
          {isEdit && itemId !== null && (
            <input type="hidden" name="id" value={String(itemId)} />
          )}
          <input type="hidden" name="active" value={active ? "on" : ""} />

          {actionState.error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
              {actionState.error}
            </p>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="cat-name">
              {t("labelName")} <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="cat-name"
              name="name"
              placeholder={t("placeholderName")}
              defaultValue={toText(item?.name)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="cat-description">{t("labelDescription")}</Label>
            <Textarea
              id="cat-description"
              name="description"
              rows={3}
              placeholder={t("placeholderDescription")}
              defaultValue={toText(item?.description)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label htmlFor="cat-icon">
              {t("labelIcon")}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {t("labelIconHint")}
              </span>
            </Label>
            <Input
              id="cat-icon"
              name="icon"
              placeholder={t("placeholderIcon")}
              defaultValue={toText(item?.icon)}
            />
          </div>

          {/* Display order */}
          <div className="space-y-2">
            <Label htmlFor="cat-order">{t("labelOrder")}</Label>
            <Input
              id="cat-order"
              name="display_order"
              type="number"
              min={0}
              placeholder={t("placeholderOrder")}
              defaultValue={displayOrder !== null ? String(displayOrder) : ""}
            />
          </div>

          {/* Active switch */}
          <div className="flex items-center gap-3">
            <Switch
              id="cat-active"
              checked={active}
              onCheckedChange={setActive}
            />
            <Label htmlFor="cat-active" className="cursor-pointer">
              {t("labelActive")}
            </Label>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancelButton")}
            </Button>
            <SubmitButton label={isEdit ? t("submitEdit") : t("submitCreate")} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
