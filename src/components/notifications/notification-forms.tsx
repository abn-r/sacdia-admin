"use client";

import { useActionState } from "react";
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
      <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
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

const initial: NotificationActionState = {};

export function DirectNotificationForm() {
  const t = useTranslations("notifications.forms");
  const [state, action] = useActionState(sendDirectNotificationAction, initial);

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
        <form action={action} className="space-y-4">
          <StatusBanner state={state} />
          <div className="space-y-2">
            <Label htmlFor="direct_user_id">
              {t("label_user_id")} <span className="text-destructive">*</span>
            </Label>
            <Input id="direct_user_id" name="user_id" placeholder={t("placeholder_user_id")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct_title">
              {t("label_title")} <span className="text-destructive">*</span>
            </Label>
            <Input id="direct_title" name="title" placeholder={t("placeholder_title_notification")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct_body">
              {t("label_body")} <span className="text-destructive">*</span>
            </Label>
            <Textarea id="direct_body" name="body" placeholder={t("placeholder_body")} rows={3} required />
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
        <form action={action} className="space-y-4">
          <StatusBanner state={state} />
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground dark:text-warning">
            {t("broadcast_warning")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcast_title">
              {t("label_title")} <span className="text-destructive">*</span>
            </Label>
            <Input id="broadcast_title" name="title" placeholder={t("placeholder_title_broadcast")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcast_body">
              {t("label_body")} <span className="text-destructive">*</span>
            </Label>
            <Textarea id="broadcast_body" name="body" placeholder={t("placeholder_body")} rows={3} required />
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
        <form action={action} className="space-y-4">
          <StatusBanner state={state} />
          <div className="space-y-2">
            <Label htmlFor="club_instance_type">
              {t("label_instance_type")} <span className="text-destructive">*</span>
            </Label>
            <Select name="instance_type" required>
              <SelectTrigger id="club_instance_type">
                <SelectValue placeholder={t("placeholder_instance_type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adventurers">{t("option_adventurers")}</SelectItem>
                <SelectItem value="pathfinders">{t("option_pathfinders")}</SelectItem>
                <SelectItem value="master_guilds">{t("option_master_guilds")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="club_instance_id">
              {t("label_instance_id")} <span className="text-destructive">*</span>
            </Label>
            <Input id="club_instance_id" name="instance_id" type="number" placeholder={t("placeholder_instance_id")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="club_title">
              {t("label_title")} <span className="text-destructive">*</span>
            </Label>
            <Input id="club_title" name="title" placeholder={t("placeholder_title_notification")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="club_body">
              {t("label_body")} <span className="text-destructive">*</span>
            </Label>
            <Textarea id="club_body" name="body" placeholder={t("placeholder_body")} rows={3} required />
          </div>
          <SubmitButton label={t("submit_club")} />
        </form>
      </CardContent>
    </Card>
  );
}
