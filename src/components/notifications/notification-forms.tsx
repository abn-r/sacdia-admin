"use client";

import { useEffect, useRef, useState, useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, Loader2, Radio, Send, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  sendDirectNotificationAction,
  broadcastNotificationAction,
  clubNotificationAction,
  type NotificationActionState,
} from "@/lib/notifications/actions";
import { ClubSelect } from "@/components/shared/selectors/club-select";
import { MemberCombobox } from "@/components/units/member-combobox";
import type { NotificationClubTarget } from "@/lib/notifications/club-targets";

function SubmitButton({
  label,
  pendingLabel,
  disabled = false,
  className,
}: {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn("w-full sm:w-auto", className)}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}

function FormSubmitFooter({
  submitLabel,
  submitDisabled = false,
}: {
  submitLabel: string;
  submitDisabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const tCompose = useTranslations("configuration.notifications.compose");

  return (
    <div className="sticky bottom-0 mt-8 border-t bg-background pt-4">
      <SubmitButton
        label={submitLabel}
        pendingLabel={tCompose("submitting")}
        disabled={submitDisabled}
        className="w-full"
      />
      <p
        className={cn(
          "mt-2 text-center text-xs",
          pending ? "text-foreground" : "text-muted-foreground",
        )}
        aria-live="polite"
      >
        {pending ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" />
            {tCompose("submittingHint")}
          </span>
        ) : (
          tCompose("submitHint")
        )}
      </p>
    </div>
  );
}

function StatusBanner({ state }: { state: NotificationActionState }) {
  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }
  if (state.success) {
    return (
      <Alert className="border-success/30 bg-success/10 text-success">
        <CheckCircle2 className="size-4 text-success" />
        <AlertDescription className="text-success">{state.success}</AlertDescription>
      </Alert>
    );
  }
  return null;
}

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      *
    </span>
  );
}

function FormBody({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <fieldset
      disabled={pending}
      className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0"
    >
      {children}
    </fieldset>
  );
}

function EmbeddedFormShell({
  children,
  submitLabel,
  submitDisabled = false,
}: {
  children: ReactNode;
  submitLabel: string;
  submitDisabled?: boolean;
}) {
  return (
    <>
      <FormBody>{children}</FormBody>
      <FormSubmitFooter submitLabel={submitLabel} submitDisabled={submitDisabled} />
    </>
  );
}

function useFieldErrorHelpers(
  state: NotificationActionState,
  formId: string,
) {
  const fieldErrors = state.fieldErrors ?? {};
  return {
    ariaInvalid: (name: string) => (fieldErrors[name] ? true : undefined),
    describedBy: (name: string) =>
      fieldErrors[name] ? `${formId}-${name}-error` : undefined,
    renderError: (name: string) =>
      fieldErrors[name] ? (
        <p
          id={`${formId}-${name}-error`}
          role="alert"
          className="text-destructive text-xs"
        >
          {fieldErrors[name]}
        </p>
      ) : null,
  };
}

const initial: NotificationActionState = {};

type NotificationFormCommonProps = {
  embedded?: boolean;
  onSuccess?: () => void;
};

type ClubNotificationFormProps = NotificationFormCommonProps & {
  clubTargets?: NotificationClubTarget[];
  clubTargetsLoadError?: boolean;
};

function useEmbeddedFormFeedback(
  embedded: boolean | undefined,
  state: NotificationActionState,
  onSuccess?: () => void,
) {
  const tCompose = useTranslations("configuration.notifications.compose");
  const lastFeedbackKey = useRef<string | null>(null);

  useEffect(() => {
    if (!embedded) return;

    const fieldErrorCount = Object.keys(state.fieldErrors ?? {}).length;
    if (fieldErrorCount > 0) {
      const key = `fields:${fieldErrorCount}:${Object.keys(state.fieldErrors ?? {}).join(",")}`;
      if (lastFeedbackKey.current === key) return;
      lastFeedbackKey.current = key;
      toast.error(tCompose("validationFailed"));
      return;
    }

    if (state.error) {
      const key = `error:${state.error}`;
      if (lastFeedbackKey.current === key) return;
      lastFeedbackKey.current = key;
      toast.error(state.error);
      return;
    }

    if (state.success) {
      const key = `success:${state.success}`;
      if (lastFeedbackKey.current === key) return;
      lastFeedbackKey.current = key;
      toast.success(state.success);
      const timer = window.setTimeout(() => {
        onSuccess?.();
      }, 700);
      return () => window.clearTimeout(timer);
    }
  }, [embedded, state, onSuccess, tCompose]);
}

export function DirectNotificationForm({
  embedded = false,
  onSuccess,
}: NotificationFormCommonProps = {}) {
  const t = useTranslations("notifications.forms");
  const tCompose = useTranslations("configuration.notifications.compose");
  const [state, action] = useActionState(sendDirectNotificationAction, initial);
  const { ariaInvalid, describedBy, renderError } = useFieldErrorHelpers(
    state,
    "notif-direct",
  );

  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  function handleClubChange(id: number | null) {
    setSelectedClubId(id);
    setSelectedUserId("");
  }

  useEmbeddedFormFeedback(embedded, state, onSuccess);

  const fields = (
    <FieldGroup>
      <FieldSet className="gap-4">
        <FieldLegend variant="label">{tCompose("sectionRecipient")}</FieldLegend>
        <Field>
          <Label>
            {t("label_user_id")} <RequiredMark />
          </Label>
          <div
            className="space-y-2"
            aria-invalid={ariaInvalid("user_id")}
            aria-describedby={describedBy("user_id")}
          >
            <ClubSelect value={selectedClubId} onChange={handleClubChange} />
            <MemberCombobox
              clubId={selectedClubId ?? 0}
              value={selectedUserId}
              onChange={setSelectedUserId}
              disabled={!selectedClubId}
            />
            {renderError("user_id")}
          </div>
        </Field>
      </FieldSet>

      <FieldSet className="gap-4">
        <FieldLegend variant="label">{tCompose("sectionContent")}</FieldLegend>
        <Field>
          <Label htmlFor="direct_title">
            {t("label_title")} <RequiredMark />
          </Label>
          <Input
            id="direct_title"
            name="title"
            placeholder={t("placeholder_title_notification")}
            required
            aria-required="true"
            aria-invalid={ariaInvalid("title")}
            aria-describedby={describedBy("title")}
          />
          {renderError("title")}
        </Field>
        <Field>
          <Label htmlFor="direct_body">
            {t("label_body")} <RequiredMark />
          </Label>
          <Textarea
            id="direct_body"
            name="body"
            placeholder={t("placeholder_body")}
            rows={4}
            className="min-h-28 resize-y"
            required
            aria-required="true"
            aria-invalid={ariaInvalid("body")}
            aria-describedby={describedBy("body")}
          />
          {renderError("body")}
        </Field>
      </FieldSet>
    </FieldGroup>
  );

  const form = embedded ? (
    <form action={action} className="flex min-h-full flex-col gap-4" noValidate>
      <input type="hidden" name="user_id" value={selectedUserId} />
      <StatusBanner state={state} />
      <EmbeddedFormShell submitLabel={t("submit_send")}>{fields}</EmbeddedFormShell>
    </form>
  ) : (
    <form action={action} className="space-y-4" noValidate>
      <StatusBanner state={state} />
      <input type="hidden" name="user_id" value={selectedUserId} />
      <div
        className="space-y-2"
        aria-invalid={ariaInvalid("user_id")}
        aria-describedby={describedBy("user_id")}
      >
        <Label>
          {t("label_user_id")} <RequiredMark />
        </Label>
        <ClubSelect value={selectedClubId} onChange={handleClubChange} />
        <MemberCombobox
          clubId={selectedClubId ?? 0}
          value={selectedUserId}
          onChange={setSelectedUserId}
          disabled={!selectedClubId}
        />
        {renderError("user_id")}
      </div>
      <div className="space-y-2">
        <Label htmlFor="direct_title">
          {t("label_title")} <RequiredMark />
        </Label>
        <Input
          id="direct_title"
          name="title"
          placeholder={t("placeholder_title_notification")}
          required
          aria-required="true"
          aria-invalid={ariaInvalid("title")}
          aria-describedby={describedBy("title")}
        />
        {renderError("title")}
      </div>
      <div className="space-y-2">
        <Label htmlFor="direct_body">
          {t("label_body")} <RequiredMark />
        </Label>
        <Textarea
          id="direct_body"
          name="body"
          placeholder={t("placeholder_body")}
          rows={3}
          required
          aria-required="true"
          aria-invalid={ariaInvalid("body")}
          aria-describedby={describedBy("body")}
        />
        {renderError("body")}
      </div>
      <SubmitButton
        label={t("submit_send")}
        pendingLabel={tCompose("submitting")}
      />
    </form>
  );

  if (embedded) return form;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Send className="size-5 text-primary" />
          <CardTitle className="text-base">{t("direct_title")}</CardTitle>
        </div>
        <CardDescription>{t("direct_description")}</CardDescription>
      </CardHeader>
      <CardContent>{form}</CardContent>
    </Card>
  );
}

export function BroadcastNotificationForm({
  embedded = false,
  onSuccess,
}: NotificationFormCommonProps = {}) {
  const t = useTranslations("notifications.forms");
  const tCompose = useTranslations("configuration.notifications.compose");
  const [state, action] = useActionState(broadcastNotificationAction, initial);
  const { ariaInvalid, describedBy, renderError } = useFieldErrorHelpers(
    state,
    "notif-broadcast",
  );

  useEmbeddedFormFeedback(embedded, state, onSuccess);

  const fields = (
    <FieldGroup>
      <Alert className="border-warning/30 bg-warning/10">
        <AlertTriangle className="size-4 text-warning" />
        <AlertDescription className="text-warning-foreground dark:text-warning">
          {t("broadcast_warning")}
        </AlertDescription>
      </Alert>

      <FieldSet className="gap-4">
        <FieldLegend variant="label">{tCompose("sectionContent")}</FieldLegend>
        <Field>
          <Label htmlFor="broadcast_title">
            {t("label_title")} <RequiredMark />
          </Label>
          <Input
            id="broadcast_title"
            name="title"
            placeholder={t("placeholder_title_broadcast")}
            required
            aria-required="true"
            aria-invalid={ariaInvalid("title")}
            aria-describedby={describedBy("title")}
          />
          {renderError("title")}
        </Field>
        <Field>
          <Label htmlFor="broadcast_body">
            {t("label_body")} <RequiredMark />
          </Label>
          <Textarea
            id="broadcast_body"
            name="body"
            placeholder={t("placeholder_body")}
            rows={4}
            className="min-h-28 resize-y"
            required
            aria-required="true"
            aria-invalid={ariaInvalid("body")}
            aria-describedby={describedBy("body")}
          />
          {renderError("body")}
        </Field>
      </FieldSet>
    </FieldGroup>
  );

  const form = embedded ? (
    <form action={action} className="flex min-h-full flex-col gap-4" noValidate>
      <StatusBanner state={state} />
      <EmbeddedFormShell submitLabel={t("submit_broadcast")}>{fields}</EmbeddedFormShell>
    </form>
  ) : (
    <form action={action} className="space-y-4" noValidate>
      <StatusBanner state={state} />
      <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground dark:text-warning">
        {t("broadcast_warning")}
      </div>
      <div className="space-y-2">
        <Label htmlFor="broadcast_title">
          {t("label_title")} <RequiredMark />
        </Label>
        <Input
          id="broadcast_title"
          name="title"
          placeholder={t("placeholder_title_broadcast")}
          required
          aria-required="true"
          aria-invalid={ariaInvalid("title")}
          aria-describedby={describedBy("title")}
        />
        {renderError("title")}
      </div>
      <div className="space-y-2">
        <Label htmlFor="broadcast_body">
          {t("label_body")} <RequiredMark />
        </Label>
        <Textarea
          id="broadcast_body"
          name="body"
          placeholder={t("placeholder_body")}
          rows={3}
          required
          aria-required="true"
          aria-invalid={ariaInvalid("body")}
          aria-describedby={describedBy("body")}
        />
        {renderError("body")}
      </div>
      <SubmitButton
        label={t("submit_broadcast")}
        pendingLabel={tCompose("submitting")}
      />
    </form>
  );

  if (embedded) return form;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radio className="size-5 text-primary" />
          <CardTitle className="text-base">{t("broadcast_title")}</CardTitle>
        </div>
        <CardDescription>{t("broadcast_description")}</CardDescription>
      </CardHeader>
      <CardContent>{form}</CardContent>
    </Card>
  );
}

export function ClubNotificationForm({
  embedded = false,
  onSuccess,
  clubTargets = [],
  clubTargetsLoadError = false,
}: ClubNotificationFormProps) {
  const t = useTranslations("notifications.forms");
  const tCompose = useTranslations("configuration.notifications.compose");
  const [state, action] = useActionState(clubNotificationAction, initial);
  const { ariaInvalid, describedBy, renderError } = useFieldErrorHelpers(
    state,
    "notif-club",
  );
  const hasTargets = clubTargets.length > 0;

  useEmbeddedFormFeedback(embedded, state, onSuccess);

  const recipientField = clubTargetsLoadError ? (
    <Alert variant="destructive">
      <AlertTriangle className="size-4" />
      <AlertDescription>{t("club_targets_load_error")}</AlertDescription>
    </Alert>
  ) : hasTargets ? (
    <Field>
      <Label htmlFor="club_instance_target">
        {t("label_instance_target")} <RequiredMark />
      </Label>
      <Select name="instance_target" required>
        <SelectTrigger
          id="club_instance_target"
          aria-invalid={ariaInvalid("instance_id")}
          aria-describedby={describedBy("instance_id")}
        >
          <SelectValue placeholder={t("placeholder_instance_target")} />
        </SelectTrigger>
        <SelectContent>
          {clubTargets.map((target) => (
            <SelectItem
              key={`${target.instanceType}-${target.instanceId}`}
              value={`${target.instanceType}:${target.instanceId}`}
            >
              {target.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {renderError("instance_id")}
    </Field>
  ) : (
    <Alert className="border-warning/30 bg-warning/10">
      <AlertTriangle className="size-4 text-warning" />
      <AlertDescription className="text-warning-foreground dark:text-warning">
        {t("no_club_targets")}
      </AlertDescription>
    </Alert>
  );

  const fields = (
    <FieldGroup>
      <FieldSet className="gap-4">
        <FieldLegend variant="label">{tCompose("sectionRecipient")}</FieldLegend>
        {recipientField}
      </FieldSet>

      <FieldSet className="gap-4">
        <FieldLegend variant="label">{tCompose("sectionContent")}</FieldLegend>
        <Field>
          <Label htmlFor="club_title">
            {t("label_title")} <RequiredMark />
          </Label>
          <Input
            id="club_title"
            name="title"
            placeholder={t("placeholder_title_notification")}
            required
            aria-required="true"
            aria-invalid={ariaInvalid("title")}
            aria-describedby={describedBy("title")}
          />
          {renderError("title")}
        </Field>
        <Field>
          <Label htmlFor="club_body">
            {t("label_body")} <RequiredMark />
          </Label>
          <Textarea
            id="club_body"
            name="body"
            placeholder={t("placeholder_body")}
            rows={4}
            className="min-h-28 resize-y"
            required
            aria-required="true"
            aria-invalid={ariaInvalid("body")}
            aria-describedby={describedBy("body")}
          />
          {renderError("body")}
        </Field>
      </FieldSet>
    </FieldGroup>
  );

  const form = embedded ? (
    <form action={action} className="flex min-h-full flex-col gap-4" noValidate>
      <StatusBanner state={state} />
      <EmbeddedFormShell
        submitLabel={t("submit_club")}
        submitDisabled={!hasTargets || clubTargetsLoadError}
      >
        {fields}
      </EmbeddedFormShell>
    </form>
  ) : (
    <form action={action} className="space-y-4" noValidate>
      <StatusBanner state={state} />
      {clubTargetsLoadError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {t("club_targets_load_error")}
        </div>
      ) : hasTargets ? (
        <div className="space-y-2">
          <Label htmlFor="club_instance_target">
            {t("label_instance_target")} <RequiredMark />
          </Label>
          <Select name="instance_target" required>
            <SelectTrigger
              id="club_instance_target"
              aria-invalid={ariaInvalid("instance_id")}
              aria-describedby={describedBy("instance_id")}
            >
              <SelectValue placeholder={t("placeholder_instance_target")} />
            </SelectTrigger>
            <SelectContent>
              {clubTargets.map((target) => (
                <SelectItem
                  key={`${target.instanceType}-${target.instanceId}`}
                  value={`${target.instanceType}:${target.instanceId}`}
                >
                  {target.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {renderError("instance_id")}
        </div>
      ) : (
        <div
          role="status"
          className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground dark:text-warning"
        >
          {t("no_club_targets")}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="club_title">
          {t("label_title")} <RequiredMark />
        </Label>
        <Input
          id="club_title"
          name="title"
          placeholder={t("placeholder_title_notification")}
          required
          aria-required="true"
          aria-invalid={ariaInvalid("title")}
          aria-describedby={describedBy("title")}
        />
        {renderError("title")}
      </div>
      <div className="space-y-2">
        <Label htmlFor="club_body">
          {t("label_body")} <RequiredMark />
        </Label>
        <Textarea
          id="club_body"
          name="body"
          placeholder={t("placeholder_body")}
          rows={3}
          required
          aria-required="true"
          aria-invalid={ariaInvalid("body")}
          aria-describedby={describedBy("body")}
        />
        {renderError("body")}
      </div>
      <SubmitButton
        label={t("submit_club")}
        pendingLabel={tCompose("submitting")}
        disabled={!hasTargets || clubTargetsLoadError}
      />
    </form>
  );

  if (embedded) return form;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <CardTitle className="text-base">{t("club_title")}</CardTitle>
        </div>
        <CardDescription>{t("club_description")}</CardDescription>
      </CardHeader>
      <CardContent>{form}</CardContent>
    </Card>
  );
}
