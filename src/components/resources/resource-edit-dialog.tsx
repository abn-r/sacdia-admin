"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToastError } from "@/lib/feedback/toast-retry";
import { updateResource, type ResourcePayload } from "@/lib/api/resources";
import type { ClubType } from "@/lib/api/catalogs";
import {
  pickClubTypeIdValue,
  pickResourceId,
  toPositiveNumber,
  toText,
} from "@/lib/resources/resource-display";
import {
  FILE_ACCEPT,
  MAX_FILE_SIZE,
  formatFileSize,
  isFileResourceType,
  toResourceType,
  type CategoryOption,
  type ResourceRecord,
} from "@/components/resources/resource-meta";

export interface ResourceEditDialogProps {
  item: ResourceRecord;
  categories: CategoryOption[];
  clubTypes: ClubType[];
  onClose: () => void;
  /** Called after a successful save so the list can refresh. */
  onSaved: () => void;
}

/**
 * Edit a resource's metadata. The type and the scope are fixed after creation;
 * a new file, when chosen, replaces the previous one.
 */
export function ResourceEditDialog({
  item,
  categories,
  clubTypes,
  onClose,
  onSaved,
}: ResourceEditDialogProps) {
  const t = useTranslations("ops.resources");
  const toastError = useToastError();
  const ids = useId();
  const id = (name: string) => `${ids}-${name}`;

  const resourceType = toResourceType(item.resource_type);
  const resourceId = pickResourceId(item);

  const [title, setTitle] = useState(toText(item.title) ?? "");
  const [description, setDescription] = useState(toText(item.description) ?? "");
  const [categoryId, setCategoryId] = useState(
    toPositiveNumber(item.resource_category_id ?? item.category_id)?.toString() ?? "none",
  );
  const [clubTypeId, setClubTypeId] = useState(pickClubTypeIdValue(item));
  const [externalUrl, setExternalUrl] = useState(toText(item.external_url) ?? "");
  const [content, setContent] = useState(toText(item.content) ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving || !resourceId) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toastError({ title: t("edit.failedTitle"), description: t("edit.titleRequired") });
      return;
    }

    const categoryValue = categoryId !== "none" ? Number(categoryId) : undefined;
    const clubTypeValue = clubTypeId !== "all" ? Number(clubTypeId) : null;

    setSaving(true);
    try {
      if (file) {
        const body = new FormData();
        body.set("title", trimmedTitle);
        body.set("description", description.trim());
        body.set("file", file);
        if (categoryValue) body.set("resource_category_id", String(categoryValue));
        if (clubTypeValue) body.set("club_type_id", String(clubTypeValue));
        await updateResource(resourceId, body);
      } else {
        const payload: Partial<ResourcePayload> = {
          title: trimmedTitle,
          description: description.trim(),
          club_type_id: clubTypeValue,
        };
        if (categoryValue) payload.resource_category_id = categoryValue;
        if (resourceType === "video_link" && externalUrl.trim()) {
          payload.external_url = externalUrl.trim();
        }
        if (resourceType === "text" && content.trim()) payload.content = content.trim();
        await updateResource(resourceId, payload);
      }
      toast.success(t("edit.success"));
      onSaved();
    } catch (error) {
      toastError({
        title: t("edit.failedTitle"),
        description: error instanceof Error && error.message ? error.message : undefined,
        onRetry: save,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>{t("edit.description")}</DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="space-y-4"
        >
          <Field>
            <FieldLabel htmlFor={id("title")}>
              {t("upload.fields.title")} <span className="text-destructive" aria-hidden="true">*</span>
            </FieldLabel>
            <Input
              id={id("title")}
              required
              maxLength={255}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={id("description")}>{t("upload.fields.description")}</FieldLabel>
            <Textarea
              id={id("description")}
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={id("type")}>{t("upload.type")}</FieldLabel>
              <Input
                id={id("type")}
                value={resourceType ? t(`types.${resourceType}`) : t("types.unknown")}
                readOnly
                disabled
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={id("category")}>{t("upload.fields.category")}</FieldLabel>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id={id("category")} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("upload.fields.noCategory")}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.resource_category_id}
                      value={String(category.resource_category_id)}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{t("edit.typeFixed")}</p>

          <Field>
            <FieldLabel htmlFor={id("club-type")}>{t("upload.fields.clubType")}</FieldLabel>
            <Select value={clubTypeId} onValueChange={setClubTypeId}>
              <SelectTrigger id={id("club-type")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("upload.fields.allClubs")}</SelectItem>
                {clubTypes.map((clubType) => (
                  <SelectItem key={clubType.club_type_id} value={String(clubType.club_type_id)}>
                    {clubType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {resourceType && isFileResourceType(resourceType) && (
            <Field data-invalid={fileError ? true : undefined}>
              <FieldLabel htmlFor={id("file")}>{t("edit.replaceFile")}</FieldLabel>
              <Input
                id={id("file")}
                type="file"
                accept={FILE_ACCEPT[resourceType] ?? "*"}
                aria-invalid={fileError ? true : undefined}
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  if (next && next.size > MAX_FILE_SIZE) {
                    setFile(null);
                    setFileError(t("upload.fileTooLarge", { size: formatFileSize(next.size) }));
                    event.target.value = "";
                    return;
                  }
                  setFileError(null);
                  setFile(next);
                }}
              />
              {fileError ? (
                <p role="alert" className="text-xs text-destructive">
                  {fileError}
                </p>
              ) : (
                <FieldDescription>{t("edit.replaceFileHint")}</FieldDescription>
              )}
            </Field>
          )}

          {resourceType === "video_link" && (
            <Field>
              <FieldLabel htmlFor={id("url")}>{t("upload.videoUrl")}</FieldLabel>
              <Input
                id={id("url")}
                type="url"
                value={externalUrl}
                onChange={(event) => setExternalUrl(event.target.value)}
              />
            </Field>
          )}

          {resourceType === "text" && (
            <Field>
              <FieldLabel htmlFor={id("content")}>{t("upload.content")}</FieldLabel>
              <Textarea
                id={id("content")}
                rows={8}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="resize-y"
              />
            </Field>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" loading={saving} disabled={!resourceId || !!fileError}>
              {t("edit.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
