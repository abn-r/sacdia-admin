"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send, Radio, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  sendDirectNotificationAction,
  broadcastNotificationAction,
  clubNotificationAction,
  type NotificationActionState,
} from "@/lib/notifications/actions";
import { ClubSelect } from "@/components/shared/selectors/club-select";
import { ClubSectionSelect } from "@/components/shared/selectors/club-section-select";
import { MemberCombobox } from "@/components/units/member-combobox";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}

function StatusBanner({ state }: { state: NotificationActionState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {state.error}
      </div>
    );
  }
  if (state.success) {
    return (
      <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
        {state.success}
      </div>
    );
  }
  return null;
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
          className="text-xs text-destructive"
        >
          {fieldErrors[name]}
        </p>
      ) : null,
  };
}

const initial: NotificationActionState = {};

export function DirectNotificationForm() {
  const t = useTranslations("notifications.forms");
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Send className="size-5 text-primary" />
          <CardTitle className="text-base">{t("direct_title")}</CardTitle>
        </div>
        <CardDescription>{t("direct_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4" noValidate>
          <StatusBanner state={state} />
          {/* Hidden input carrying user_id for the server action */}
          <input type="hidden" name="user_id" value={selectedUserId} />
          <div
            className="space-y-2"
            aria-invalid={ariaInvalid("user_id")}
            aria-describedby={describedBy("user_id")}
          >
            <Label>
              {t("label_user_id")} <span className="text-destructive">*</span>
            </Label>
            <ClubSelect
              value={selectedClubId}
              onChange={handleClubChange}
            />
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
              {t("label_title")} <span className="text-destructive">*</span>
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
              {t("label_body")} <span className="text-destructive">*</span>
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
          <SubmitButton label={t("submit_send")} />
        </form>
      </CardContent>
    </Card>
  );
}

export function BroadcastNotificationForm() {
  const t = useTranslations("notifications.forms");
  const [state, action] = useActionState(broadcastNotificationAction, initial);
  const { ariaInvalid, describedBy, renderError } = useFieldErrorHelpers(
    state,
    "notif-broadcast",
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radio className="size-5 text-primary" />
          <CardTitle className="text-base">{t("broadcast_title")}</CardTitle>
        </div>
        <CardDescription>{t("broadcast_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4" noValidate>
          <StatusBanner state={state} />
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground dark:text-warning">
            {t("broadcast_warning")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcast_title">
              {t("label_title")} <span className="text-destructive">*</span>
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
              {t("label_body")} <span className="text-destructive">*</span>
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
          <SubmitButton label={t("submit_broadcast")} />
        </form>
      </CardContent>
    </Card>
  );
}

export function ClubNotificationForm() {
  const t = useTranslations("notifications.forms");
  const [state, action] = useActionState(clubNotificationAction, initial);
  const { ariaInvalid, describedBy, renderError } = useFieldErrorHelpers(
    state,
    "notif-club",
  );

  const [instanceType, setInstanceType] = useState<string>("");
  const [selectedClubIdForNotif, setSelectedClubIdForNotif] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);

  function handleInstanceTypeChange(value: string) {
    setInstanceType(value);
    setSelectedSectionId(null);
  }

  function handleClubForNotifChange(id: number | null) {
    setSelectedClubIdForNotif(id);
    setSelectedSectionId(null);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <CardTitle className="text-base">{t("club_title")}</CardTitle>
        </div>
        <CardDescription>{t("club_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4" noValidate>
          <StatusBanner state={state} />
          {/* Hidden input carrying instance_id for the server action */}
          <input
            type="hidden"
            name="instance_id"
            value={selectedSectionId ?? ""}
          />
          <div className="space-y-2">
            <Label htmlFor="club_instance_type">
              {t("label_instance_type")} <span className="text-destructive">*</span>
            </Label>
            <Select
              name="instance_type"
              required
              value={instanceType}
              onValueChange={handleInstanceTypeChange}
            >
              <SelectTrigger
                id="club_instance_type"
                aria-invalid={ariaInvalid("instance_type")}
                aria-describedby={describedBy("instance_type")}
              >
                <SelectValue placeholder={t("placeholder_instance_type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adventurers">{t("option_adventurers")}</SelectItem>
                <SelectItem value="pathfinders">{t("option_pathfinders")}</SelectItem>
                <SelectItem value="master_guilds">{t("option_master_guilds")}</SelectItem>
              </SelectContent>
            </Select>
            {renderError("instance_type")}
          </div>
          <div
            className="space-y-2"
            aria-invalid={ariaInvalid("instance_id")}
            aria-describedby={describedBy("instance_id")}
          >
            <Label>
              {t("label_instance_id")} <span className="text-destructive">*</span>
            </Label>
            <ClubSelect
              value={selectedClubIdForNotif}
              onChange={handleClubForNotifChange}
            />
            <ClubSectionSelect
              clubId={selectedClubIdForNotif}
              sectionTypeKey={instanceType || undefined}
              value={selectedSectionId}
              onChange={setSelectedSectionId}
              disabled={!selectedClubIdForNotif || !instanceType}
            />
            {renderError("instance_id")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="club_title">
              {t("label_title")} <span className="text-destructive">*</span>
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
              {t("label_body")} <span className="text-destructive">*</span>
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
          <SubmitButton label={t("submit_club")} />
        </form>
      </CardContent>
    </Card>
  );
}
