"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequestFromClient } from "@/lib/api/client";
import type { UpdateAdminUserPayload } from "@/lib/api/admin-users";

interface UserAccessTogglesProps {
  userId: string;
  initialAccessApp: boolean | undefined;
  initialAccessPanel: boolean | undefined;
  initialActive: boolean | undefined;
  /** Accesos is admin/super-admin only; hide (do not disable) otherwise. */
  canManage: boolean;
}

async function patchUser(userId: string, payload: UpdateAdminUserPayload): Promise<void> {
  await apiRequestFromClient<unknown>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: payload,
  });
}

export function UserAccessToggles(props: UserAccessTogglesProps) {
  if (!props.canManage) {
    return null;
  }

  return <UserAccessTogglesForm {...props} />;
}

function UserAccessTogglesForm({
  userId,
  initialAccessApp,
  initialAccessPanel,
  initialActive,
  canManage,
}: UserAccessTogglesProps) {
  const t = useTranslations("users");
  const [accessApp, setAccessApp] = useState(initialAccessApp ?? false);
  const [accessPanel, setAccessPanel] = useState(initialAccessPanel ?? false);
  const [active, setActive] = useState(initialActive ?? true);

  const [pendingField, setPendingField] = useState<
    "access_app" | "access_panel" | "active" | null
  >(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(
    field: "access_app" | "access_panel" | "active",
    currentValue: boolean,
    setter: (v: boolean) => void,
  ) {
    if (!canManage) {
      return;
    }

    const nextValue = !currentValue;
    setter(nextValue);
    setPendingField(field);

    const patch: UpdateAdminUserPayload = {};
    patch[field] = nextValue;

    startTransition(async () => {
      try {
        await patchUser(userId, patch);
        toast.success(t("toasts.access_updated"));
      } catch {
        setter(currentValue);
        toast.error(t("toasts.access_update_failed"));
      } finally {
        setPendingField(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("access.card_title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="toggle-access-app" className="text-sm text-muted-foreground">
            {t("access.access_app_label")}
          </Label>
          <div className="flex items-center gap-2">
            {isPending && pendingField === "access_app" && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="toggle-access-app"
              aria-label={t("access.access_app_label")}
              checked={accessApp}
              disabled={isPending}
              onCheckedChange={() =>
                handleToggle("access_app", accessApp, setAccessApp)
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="toggle-access-panel" className="text-sm text-muted-foreground">
            {t("access.access_panel_label")}
          </Label>
          <div className="flex items-center gap-2">
            {isPending && pendingField === "access_panel" && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="toggle-access-panel"
              aria-label={t("access.access_panel_label")}
              checked={accessPanel}
              disabled={isPending}
              onCheckedChange={() =>
                handleToggle("access_panel", accessPanel, setAccessPanel)
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="toggle-active" className="text-sm text-muted-foreground">
            {t("access.active_label")}
          </Label>
          <div className="flex items-center gap-2">
            {isPending && pendingField === "active" && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="toggle-active"
              aria-label={t("access.active_label")}
              checked={active}
              disabled={isPending}
              onCheckedChange={() =>
                handleToggle("active", active, setActive)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
