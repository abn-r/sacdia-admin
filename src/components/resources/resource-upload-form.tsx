"use client";

import { useId, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload } from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ErrorState } from "@/components/shared/error-state";
import {
  FormModalBody,
  FormModalFooter,
  FormModalSteps,
  useFormModal,
} from "@/components/shared/form-modal";
import { useFormSteps } from "@/components/shared/use-form-steps";
import { useToastError } from "@/lib/feedback/toast-retry";
import { createResource, type ResourceType, type ScopeLevel } from "@/lib/api/resources";
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";
import {
  FILE_ACCEPT,
  MAX_FILE_SIZE,
  RESOURCE_TYPES,
  RESOURCE_TYPE_ICONS,
  SCOPE_LEVELS,
  formatFileSize,
  isFileResourceType,
  type CategoryOption,
} from "@/components/resources/resource-meta";
import { cn } from "@/lib/utils";

const LIST_HREF = "/dashboard/resources";
const STEP_COUNT = 3;
const OPTION_ON = "data-[state=on]:bg-primary/10 data-[state=on]:text-primary";

export interface ResourceUploadFormProps {
  categories: CategoryOption[];
  /** The categories request failed: say so instead of offering "no category". */
  categoriesFailed?: boolean;
  clubTypes: ClubType[];
  unions: Union[];
  localFields: LocalField[];
  /** Levels the role may publish at; the others stay visible but disabled. */
  allowedScopeLevels: ScopeLevel[];
  /** Territory the role is pinned to (union or local field), if any. */
  lockedScopeId: number | null;
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

export function ResourceUploadForm({
  categories,
  categoriesFailed = false,
  clubTypes,
  unions,
  localFields,
  allowedScopeLevels,
  lockedScopeId,
}: ResourceUploadFormProps) {
  const t = useTranslations("ops.resources");
  const tModal = useTranslations("shared.formModal");
  const format = useFormatter();
  const modal = useFormModal(LIST_HREF);
  const toastError = useToastError();
  const ids = useId();
  const id = (name: string) => `${ids}-${name}`;

  const steps = useFormSteps(STEP_COUNT);
  const stepLabels = [t("upload.steps.file"), t("upload.steps.data"), t("upload.steps.scope")];

  // Step 1: file
  const [resourceType, setResourceType] = useState<ResourceType>("document");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [content, setContent] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 2: data
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("none");

  // Step 3: scope
  const initialLevel: ScopeLevel = allowedScopeLevels[0] ?? "system";
  const [scopeLevel, setScopeLevel] = useState<ScopeLevel>(initialLevel);
  const [scopeId, setScopeId] = useState(lockedScopeId !== null ? String(lockedScopeId) : "");
  const [clubTypeId, setClubTypeId] = useState("all");

  const [submitting, setSubmitting] = useState(false);

  const canPublishAnywhere = allowedScopeLevels.length > 0;
  const levelLocked = lockedScopeId !== null && allowedScopeLevels.length === 1;
  const isFileType = isFileResourceType(resourceType);
  const TypeIcon = RESOURCE_TYPE_ICONS[resourceType];

  function pickFile(next: File | null) {
    if (!next) {
      setFile(null);
      return;
    }
    if (next.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError(t("upload.fileTooLarge", { size: formatFileSize(next.size) }));
      return;
    }
    setFileError(null);
    setFile(next);
    if (!title.trim()) setTitle(stripExtension(next.name).slice(0, 255));
  }

  function handleTypeChange(value: string) {
    if (!value || value === resourceType) return;
    setResourceType(value as ResourceType);
    setFile(null);
    setFileError(null);
  }

  function handleLevelChange(value: string) {
    if (!value) return;
    const next = value as ScopeLevel;
    if (!allowedScopeLevels.includes(next)) return;
    setScopeLevel(next);
    if (!levelLocked) setScopeId("");
  }

  function territoryName(level: ScopeLevel, rawId: string): string | null {
    const numeric = Number(rawId);
    if (level === "system") return null;
    if (!rawId || !Number.isFinite(numeric) || numeric <= 0) return null;
    if (level === "union") {
      return unions.find((u) => u.union_id === numeric)?.name ?? t("scope.unionId", { id: numeric });
    }
    if (level === "local_field") {
      return (
        localFields.find((lf) => lf.local_field_id === numeric)?.name ??
        t("scope.localFieldId", { id: numeric })
      );
    }
    return t("scope.divisionId", { id: numeric });
  }

  const clubTypeName =
    clubTypeId === "all"
      ? null
      : (clubTypes.find((c) => String(c.club_type_id) === clubTypeId)?.name ?? null);
  const territory = territoryName(scopeLevel, scopeId);

  // One sentence that says who will see the resource.
  let audience: string;
  if (!canPublishAnywhere) {
    audience = t("upload.summary.noLevels");
  } else if (scopeLevel === "system") {
    audience = clubTypeName
      ? t("upload.summary.systemType", { clubType: clubTypeName })
      : t("upload.summary.systemAll");
  } else if (!territory) {
    audience = t("upload.summary.pending");
  } else {
    audience = clubTypeName
      ? t("upload.summary.territoryType", { clubType: clubTypeName, territory })
      : t("upload.summary.territoryAll", { territory });
  }

  const resourceLine = [
    t(`types.${resourceType}`),
    isFileType && file ? formatFileSize(file.size) : null,
    title.trim() || (file ? file.name : null),
  ]
    .filter(Boolean)
    .join(" · ");

  const levelNames = format.list(
    allowedScopeLevels.map((level) => t(`levels.${level}`)),
    { type: "disjunction" },
  );

  async function publish() {
    if (submitting) return;
    const level = scopeLevel;
    const numericScopeId = Number(scopeId);
    const failure = (message: string) =>
      toastError({ title: t("upload.failedTitle"), description: message, onRetry: publish });

    if (!allowedScopeLevels.includes(level)) {
      failure(t("upload.errors.levelNotAllowed"));
      return;
    }
    if (level !== "system" && (!Number.isFinite(numericScopeId) || numericScopeId <= 0)) {
      failure(t("upload.errors.territoryRequired"));
      return;
    }
    if (lockedScopeId !== null && level !== "system" && numericScopeId !== lockedScopeId) {
      failure(t("upload.errors.levelNotAllowed"));
      return;
    }
    if (isFileType && !file) {
      failure(t("upload.errors.fileRequired"));
      return;
    }

    const body = new FormData();
    body.set("title", title.trim());
    body.set("resource_type", resourceType);
    body.set("scope_level", level);
    if (level !== "system") body.set("scope_id", String(Math.floor(numericScopeId)));
    if (description.trim()) body.set("description", description.trim());
    if (categoryId !== "none") body.set("resource_category_id", categoryId);
    if (clubTypeId !== "all") body.set("club_type_id", clubTypeId);
    if (isFileType && file) body.set("file", file);
    if (resourceType === "video_link") body.set("external_url", externalUrl.trim());
    if (resourceType === "text") body.set("content", content.trim());

    setSubmitting(true);
    try {
      await createResource(body);
      toast.success(t("upload.success"));
      modal.complete();
    } catch (error) {
      failure(error instanceof Error && error.message ? error.message : t("upload.errors.unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    steps.handleSubmit(event);
    if (event.defaultPrevented) return;
    event.preventDefault();
    void publish();
  }

  const lastStep = steps.lastStep;
  const territoryLabel = t(`levels.${scopeLevel}`);
  const lockedTerritoryName = territoryName(scopeLevel, scopeId);

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={steps.handleKeyDown}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <FormModalSteps steps={stepLabels} current={steps.step} />

      <FormModalBody stepKey={steps.step} direction={steps.direction} className="space-y-5">
        {/* Step 1: file */}
        <div ref={steps.stepRef(0)} hidden={steps.step !== 0} className="space-y-5">
          <Field>
            <FieldLabel id={id("type-label")}>
              {t("upload.type")} <span className="text-destructive" aria-hidden="true">*</span>
            </FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={resourceType}
              onValueChange={handleTypeChange}
              aria-labelledby={id("type-label")}
              className="w-full"
            >
              {RESOURCE_TYPES.map((type) => {
                const Icon = RESOURCE_TYPE_ICONS[type];
                return (
                  <ToggleGroupItem
                    key={type}
                    value={type}
                    className={cn("flex-1 gap-1.5 px-2", OPTION_ON)}
                  >
                    <Icon className="size-4 max-sm:hidden" aria-hidden />
                    {t(`types.${type}`)}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </Field>

          {isFileType && (
            <Field data-invalid={fileError ? true : undefined}>
              <label
                htmlFor={id("file")}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const dropped = event.dataTransfer.files[0] ?? null;
                  // Keep the native input in sync so its `required` check sees the file.
                  if (dropped && fileInputRef.current) {
                    fileInputRef.current.files = event.dataTransfer.files;
                  }
                  pickFile(dropped);
                  if (dropped && dropped.size > MAX_FILE_SIZE && fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1 rounded-lg border bg-muted/40 px-4 py-8 text-center transition-colors hover:bg-muted/60 focus-within:ring-[3px] focus-within:ring-ring/50",
                  dragging && "bg-primary/10",
                )}
              >
                <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                  {file ? (
                    <TypeIcon className="size-5" aria-hidden />
                  ) : (
                    <Upload className="size-5" aria-hidden />
                  )}
                </span>
                {file ? (
                  <>
                    <span className="max-w-full break-words text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatFileSize(file.size)} · {t("upload.dropzone.change")}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium">{t("upload.dropzone.title")}</span>
                    <span className="text-xs text-muted-foreground">
                      {t(`upload.dropzone.hint.${resourceType as "document" | "audio" | "image"}`)}
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  id={id("file")}
                  type="file"
                  required
                  accept={FILE_ACCEPT[resourceType] ?? "*"}
                  className="sr-only"
                  aria-describedby={fileError ? id("file-error") : undefined}
                  aria-invalid={fileError ? true : undefined}
                  onChange={(event) => {
                    pickFile(event.target.files?.[0] ?? null);
                    // A rejected file must not stay in the input.
                    if (!event.target.files?.[0] || event.target.files[0].size > MAX_FILE_SIZE) {
                      event.target.value = "";
                    }
                  }}
                />
              </label>
              {fileError && (
                <p id={id("file-error")} role="alert" className="text-xs text-destructive">
                  {fileError}
                </p>
              )}
            </Field>
          )}

          {resourceType === "video_link" && (
            <Field>
              <FieldLabel htmlFor={id("url")}>
                {t("upload.videoUrl")} <span className="text-destructive" aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                id={id("url")}
                type="url"
                required
                value={externalUrl}
                onChange={(event) => setExternalUrl(event.target.value)}
                placeholder="https://youtube.com/watch?v=…"
              />
              <FieldDescription>{t("upload.videoUrlHint")}</FieldDescription>
            </Field>
          )}

          {resourceType === "text" && (
            <Field>
              <FieldLabel htmlFor={id("content")}>
                {t("upload.content")} <span className="text-destructive" aria-hidden="true">*</span>
              </FieldLabel>
              <Textarea
                id={id("content")}
                required
                rows={8}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="resize-y"
              />
            </Field>
          )}
        </div>

        {/* Step 2: data */}
        <div ref={steps.stepRef(1)} hidden={steps.step !== 1} className="space-y-4">
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
              placeholder={t("upload.fields.titlePlaceholder")}
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

          <Field>
            <FieldLabel htmlFor={id("category")}>{t("upload.fields.category")}</FieldLabel>
            {categoriesFailed ? (
              <ErrorState
                variant="inline"
                kind="error"
                retry
                title={t("upload.categoriesFailed")}
              />
            ) : (
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
            )}
          </Field>
        </div>

        {/* Step 3: scope */}
        <div ref={steps.stepRef(2)} hidden={steps.step !== 2} className="space-y-4">
          <Field>
            <FieldLabel id={id("level-label")}>
              {t("upload.level")} <span className="text-destructive" aria-hidden="true">*</span>
            </FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={scopeLevel}
              onValueChange={handleLevelChange}
              aria-labelledby={id("level-label")}
              className="w-full"
            >
              {SCOPE_LEVELS.map((level) => (
                <ToggleGroupItem
                  key={level}
                  value={level}
                  disabled={!allowedScopeLevels.includes(level)}
                  className={cn("flex-1 px-2", OPTION_ON)}
                >
                  {t(`levels.${level}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldDescription>
              {canPublishAnywhere
                ? allowedScopeLevels.length === SCOPE_LEVELS.length
                  ? t("upload.levelHintAll")
                  : t("upload.levelHint", { levels: levelNames })
                : t("upload.levelHintNone")}
            </FieldDescription>
          </Field>

          {scopeLevel !== "system" && canPublishAnywhere && (
            <Field>
              <FieldLabel htmlFor={id("territory")}>
                {territoryLabel} <span className="text-destructive" aria-hidden="true">*</span>
              </FieldLabel>
              {levelLocked ? (
                <>
                  <Input
                    id={id("territory")}
                    value={lockedTerritoryName ?? ""}
                    readOnly
                    disabled
                  />
                  <FieldDescription>{t("upload.territoryLocked")}</FieldDescription>
                </>
              ) : scopeLevel === "union" && unions.length > 0 ? (
                <Select value={scopeId} onValueChange={setScopeId} required>
                  <SelectTrigger id={id("territory")} className="w-full">
                    <SelectValue placeholder={t("upload.selectUnion")} />
                  </SelectTrigger>
                  <SelectContent>
                    {unions.map((union) => (
                      <SelectItem key={union.union_id} value={String(union.union_id)}>
                        {union.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : scopeLevel === "local_field" && localFields.length > 0 ? (
                <Select value={scopeId} onValueChange={setScopeId} required>
                  <SelectTrigger id={id("territory")} className="w-full">
                    <SelectValue placeholder={t("upload.selectLocalField")} />
                  </SelectTrigger>
                  <SelectContent>
                    {localFields.map((field) => (
                      <SelectItem key={field.local_field_id} value={String(field.local_field_id)}>
                        {field.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={id("territory")}
                  type="number"
                  min={1}
                  required
                  value={scopeId}
                  onChange={(event) => setScopeId(event.target.value)}
                  placeholder={t(`upload.territoryId.${scopeLevel as Exclude<ScopeLevel, "system">}`)}
                />
              )}
            </Field>
          )}

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

          <div
            data-slot="upload-summary"
            className="flex flex-col gap-0.5 rounded-lg bg-muted px-3.5 py-3 text-sm text-muted-foreground"
          >
            <span>{t("upload.summary.label")}</span>
            <b className="font-semibold text-foreground">{audience}</b>
            <span className="break-words">{resourceLine}</span>
          </div>
        </div>

        {steps.stepIncomplete && (
          <p role="alert" className="text-sm text-destructive">
            {tModal("stepIncomplete")}
          </p>
        )}
      </FormModalBody>

      <FormModalFooter step={steps.step} total={STEP_COUNT}>
        {steps.step === 0 ? (
          <Button
            key="cancel"
            type="button"
            variant="outline"
            onClick={modal.close}
            disabled={submitting}
          >
            {t("actions.cancel")}
          </Button>
        ) : (
          <Button
            key="back"
            type="button"
            variant="outline"
            onClick={() => steps.goTo(steps.step - 1)}
            disabled={submitting}
          >
            {tModal("back")}
          </Button>
        )}
        {steps.step < lastStep ? (
          // Distinct keys: the "Continuar" button must not turn into the submit button
          // (same DOM node, type flipped mid-click) or that click would submit the form.
          <Button key="continue" type="button" onClick={steps.goNext}>
            {tModal("continue")}
          </Button>
        ) : (
          <Button key="publish" type="submit" loading={submitting} disabled={!canPublishAnywhere}>
            {t("upload.publish")}
          </Button>
        )}
      </FormModalFooter>
    </form>
  );
}
