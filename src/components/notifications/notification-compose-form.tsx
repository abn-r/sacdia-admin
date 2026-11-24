"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  FormModalBody,
  FormModalFooter,
  useFormModal,
} from "@/components/shared/form-modal";
import { ClubSelect } from "@/components/shared/selectors/club-select";
import { MemberCombobox } from "@/components/units/member-combobox";
import { Segmented } from "@/components/shared/segmented";
import {
  broadcastNotificationAction,
  clubNotificationAction,
  sendDirectNotificationAction,
  type NotificationActionState,
} from "@/lib/notifications/actions";
import type { NotificationComposeData } from "@/lib/notifications/compose-data";
import {
  availableComposeAudiences,
  buildComposeFormData,
  validateCompose,
  type ComposeAudience,
  type ComposeDraft,
} from "@/lib/notifications/compose";

const LIST_HREF = "/dashboard/notifications";

type NotificationComposeFormProps = {
  data: NotificationComposeData;
  initialAudience?: ComposeAudience;
};

function PushPreview({ title, body }: { title: string; body: string }) {
  const t = useTranslations("people.community.notifications.compose");
  return (
    <section aria-labelledby="push-preview-title" className="space-y-2">
      <h3 id="push-preview-title" className="font-medium text-sm">
        {t("previewHeading")}
      </h3>
      <div className="flex items-start gap-3 rounded-xl bg-muted p-3.5" data-testid="push-preview">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground">
          <Bell className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-0.5 text-sm">
          <p className={title ? "font-semibold text-foreground" : "font-semibold text-muted-foreground"}>
            {title || t("previewTitlePlaceholder")}
          </p>
          <p className="break-words text-muted-foreground">{body || t("previewBodyPlaceholder")}</p>
        </div>
      </div>
    </section>
  );
}

export function NotificationComposeForm({ data, initialAudience }: NotificationComposeFormProps) {
  const t = useTranslations("notifications");
  const tc = useTranslations("people.community.notifications.compose");
  const audienceLabelId = useId();
  const modal = useFormModal(LIST_HREF);
  const [pending, startTransition] = useTransition();

  const audiences = useMemo(() => availableComposeAudiences(data.permissions), [data.permissions]);
  const [audience, setAudience] = useState<ComposeAudience>(
    initialAudience && audiences.includes(initialAudience) ? initialAudience : (audiences[0] ?? "person"),
  );
  const [clubId, setClubId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [instanceTarget, setInstanceTarget] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const draft: ComposeDraft = { audience, userId, instanceTarget, title, body };

  function runAction(): Promise<NotificationActionState> {
    const formData = buildComposeFormData(draft);
    switch (audience) {
      case "person":
        return sendDirectNotificationAction({}, formData);
      case "club":
        return clubNotificationAction({}, formData);
      case "everyone":
        return broadcastNotificationAction({}, formData);
    }
  }

  function validate(): boolean {
    const keys = validateCompose(draft);
    const errors: Record<string, string> = {};
    for (const [field, key] of Object.entries(keys)) if (key) errors[field] = t(key);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError(tc("validationFailed"));
      return false;
    }
    setFormError(null);
    return true;
  }

  function applyResult(result: NotificationActionState): boolean {
    if (result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      setFormError(tc("validationFailed"));
      return false;
    }
    if (result.error) {
      setFormError(result.error);
      return false;
    }
    toast.success(result.success ?? t("success.sent"));
    modal.complete();
    return true;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!validate()) return;
    if (audience === "everyone") {
      setConfirmOpen(true);
      return;
    }
    startTransition(async () => {
      applyResult(await runAction());
    });
  }

  async function confirmBroadcast() {
    const result = await runAction();
    if (result.error || result.fieldErrors) {
      throw new Error(result.error ?? tc("validationFailed"));
    }
    toast.success(result.success ?? t("success.broadcast_sent"));
    modal.complete();
  }

  const noClubTargets = audience === "club" && !data.clubTargetsLoadError && data.clubTargets.length === 0;
  const submitBlocked = audience === "club" && (data.clubTargetsLoadError || noClubTargets);
  const submitLabel = audience === "everyone" ? tc("submitEveryone") : tc("submit");

  const audienceOptions = audiences.map((value) => ({
    value,
    label: tc(`audience.${value}`),
  }));

  const deviceText =
    data.deviceCount === null
      ? tc("everyoneWarningNoCount")
      : tc("everyoneWarning", { count: data.deviceCount });

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <FormModalBody>
          <fieldset disabled={pending} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
            {audiences.length > 1 ? (
              <div className="space-y-2">
                <span id={audienceLabelId} className="font-medium text-sm leading-none">
                  {tc("audienceLabel")}
                </span>
                <Segmented<ComposeAudience>
                  fill
                  labelledBy={audienceLabelId}
                  options={audienceOptions}
                  value={audience}
                  onChange={(next) => {
                    setAudience(next);
                    setFieldErrors({});
                    setFormError(null);
                  }}
                />
              </div>
            ) : null}

            {audience === "person" ? (
              <div className="space-y-2">
                <Label htmlFor="compose-person">
                  {t("forms.label_user_id")}
                </Label>
                <div
                  id="compose-person"
                  className="space-y-2"
                  aria-invalid={fieldErrors.user_id ? true : undefined}
                >
                  <ClubSelect
                    value={clubId}
                    onChange={(next) => {
                      setClubId(next);
                      setUserId("");
                    }}
                  />
                  <MemberCombobox
                    clubId={clubId ?? 0}
                    value={userId}
                    onChange={setUserId}
                    disabled={!clubId}
                  />
                </div>
                {fieldErrors.user_id ? (
                  <p role="alert" className="text-destructive text-xs">
                    {fieldErrors.user_id}
                  </p>
                ) : null}
              </div>
            ) : null}

            {audience === "club" ? (
              data.clubTargetsLoadError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertDescription>{t("forms.club_targets_load_error")}</AlertDescription>
                </Alert>
              ) : noClubTargets ? (
                <Alert>
                  <AlertTriangle className="size-4" />
                  <AlertDescription>{t("forms.no_club_targets")}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="compose-club-target">{tc("clubLabel")}</Label>
                  <Select value={instanceTarget || undefined} onValueChange={setInstanceTarget}>
                    <SelectTrigger
                      id="compose-club-target"
                      className="w-full"
                      aria-invalid={fieldErrors.instance_id ? true : undefined}
                    >
                      <SelectValue placeholder={t("forms.placeholder_instance_target")} />
                    </SelectTrigger>
                    <SelectContent>
                      {data.clubTargets.map((target) => (
                        <SelectItem
                          key={`${target.instanceType}-${target.instanceId}`}
                          value={`${target.instanceType}:${target.instanceId}`}
                        >
                          {target.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.instance_id ? (
                    <p role="alert" className="text-destructive text-xs">
                      {fieldErrors.instance_id}
                    </p>
                  ) : null}
                </div>
              )
            ) : null}

            {audience === "everyone" ? (
              <Alert className="border-warning/30 bg-warning/10">
                <AlertTriangle className="size-4 text-warning" />
                <AlertDescription className="text-warning-foreground dark:text-warning">
                  {deviceText}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="compose-title">{t("forms.label_title")}</Label>
              <Input
                id="compose-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("forms.placeholder_title_notification")}
                maxLength={120}
                autoComplete="off"
                aria-invalid={fieldErrors.title ? true : undefined}
                aria-describedby={fieldErrors.title ? "compose-title-error" : undefined}
              />
              {fieldErrors.title ? (
                <p id="compose-title-error" role="alert" className="text-destructive text-xs">
                  {fieldErrors.title}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="compose-body">{t("forms.label_body")}</Label>
              <Textarea
                id="compose-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={t("forms.placeholder_body")}
                rows={4}
                className="min-h-24 resize-y"
                aria-invalid={fieldErrors.body ? true : undefined}
                aria-describedby={fieldErrors.body ? "compose-body-error" : undefined}
              />
              {fieldErrors.body ? (
                <p id="compose-body-error" role="alert" className="text-destructive text-xs">
                  {fieldErrors.body}
                </p>
              ) : null}
            </div>

            <PushPreview title={title.trim()} body={body.trim()} />

            {formError ? (
              <p role="alert" className="text-destructive text-sm">
                {formError}
              </p>
            ) : null}
          </fieldset>
        </FormModalBody>

        <FormModalFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={modal.close}>
            {tc("cancel")}
          </Button>
          <Button type="submit" loading={pending} disabled={submitBlocked}>
            {submitLabel}
          </Button>
        </FormModalFooter>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={tc("confirmEveryone.title")}
        description={
          data.deviceCount === null
            ? tc("confirmEveryone.descriptionNoCount", { title: title.trim() })
            : tc("confirmEveryone.description", {
                title: title.trim(),
                count: data.deviceCount,
              })
        }
        confirmLabel={
          data.deviceCount === null
            ? tc("confirmEveryone.confirmNoCount")
            : tc("confirmEveryone.confirm", { count: data.deviceCount })
        }
        onConfirm={confirmBroadcast}
      />
    </>
  );
}
