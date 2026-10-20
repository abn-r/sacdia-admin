"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldOff, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  DetailCols2,
  DetailField,
  DetailSection,
} from "@/components/users/detail/section";
import {
  disableSupervisedLoginFromClient,
  FAMILY_ACCESS_REASON_MAX_LENGTH,
  FAMILY_ACCESS_REASON_MIN_LENGTH,
  revokeLinkedDeviceFromClient,
  type AdminDisabledSupervisedLogin,
  type AdminFamilyAccess,
  type AdminLinkedDevice,
  type AdminRevokedLinkedDevice,
  type AdminSupervisedLogin,
} from "@/lib/api/admin-users";
import { UserSessionsList } from "@/components/users/user-sessions-list";
import { ApiError } from "@/lib/api/client";
import { useFormatDate, useFormatDateTime } from "@/lib/format-locale";

const DASH = "—";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(status: AdminSupervisedLogin["status"]) {
  if (status === "active") return "soft-success" as const;
  if (status === "pending_guardian") return "soft-warning" as const;
  return "destructive" as const;
}

/** Only the machine `code` is read: `details` is never trusted nor shown. */
function readErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== "object") {
    return null;
  }
  const code = (error.payload as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

type ErrorKey =
  | "ADMIN_USER_NOT_FOUND"
  | "SUPERVISED_LOGIN_NOT_FOUND"
  | "DEVICE_NOT_FOUND"
  | "forbidden"
  | "invalid_reason"
  | "generic";

function errorKeyOf(error: unknown): ErrorKey {
  const code = readErrorCode(error);
  if (
    code === "ADMIN_USER_NOT_FOUND" ||
    code === "SUPERVISED_LOGIN_NOT_FOUND" ||
    code === "DEVICE_NOT_FOUND"
  ) {
    return code;
  }
  if (error instanceof ApiError) {
    if (error.status === 403) return "forbidden";
    if (error.status === 400) return "invalid_reason";
  }
  return "generic";
}

// ─── Reason dialog ────────────────────────────────────────────────────────────

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** Runs the action; throws to keep the dialog open with a mapped message. */
  onConfirm: (reason: string) => Promise<void>;
}

/**
 * Destructive confirmation with a REQUIRED reason (>= 5 trimmed chars): the
 * backend stores it in the audit log. The dialog stays open until the request
 * settles, so an error remains visible next to the typed reason.
 */
function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ReasonDialogProps) {
  const t = useTranslations("familyAccess");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);

  const trimmedLength = reason.trim().length;
  const valid = trimmedLength >= FAMILY_ACCESS_REASON_MIN_LENGTH;
  const showTooShort = reason.length > 0 && !valid;

  function handleOpenChange(next: boolean) {
    if (pending) return;
    if (!next) {
      setReason("");
      setErrorKey(null);
    }
    onOpenChange(next);
  }

  async function handleConfirm() {
    if (!valid || pending) return;
    setPending(true);
    setErrorKey(null);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } catch (error) {
      setErrorKey(errorKeyOf(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <ShieldOff className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="family-access-reason">{t("dialog.reasonLabel")}</Label>
          <Textarea
            id="family-access-reason"
            value={reason}
            rows={3}
            maxLength={FAMILY_ACCESS_REASON_MAX_LENGTH}
            placeholder={t("dialog.reasonPlaceholder")}
            disabled={pending}
            aria-invalid={showTooShort || undefined}
            onChange={(event) => setReason(event.target.value)}
          />
          {showTooShort ? (
            <p className="text-xs text-destructive">{t("dialog.reasonTooShort")}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("dialog.reasonHint")}</p>
          )}
          {errorKey && (
            <p role="alert" className="text-sm text-destructive">
              {t(`errors.${errorKey}`)}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("dialog.cancel")}</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!valid || pending}
            onClick={() => void handleConfirm()}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? t("dialog.working") : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface UserFamilyAccessCardProps {
  userId: string;
  familyAccess: AdminFamilyAccess;
  /**
   * `users:update_admin` + the sensitive `legal_representative:update`. The
   * backend is the authority; without it no action is rendered.
   */
  canManage: boolean;
}

type LoginPatch = Pick<AdminSupervisedLogin, "status" | "disabled_at" | "disabled_reason">;
type DevicePatch = Pick<AdminLinkedDevice, "status" | "revoked_at" | "revoked_reason">;

export function UserFamilyAccessCard({
  userId,
  familyAccess,
  canManage,
}: UserFamilyAccessCardProps) {
  const t = useTranslations("familyAccess");
  const router = useRouter();
  const formatDate = useFormatDate();
  const formatDateTime = useFormatDateTime();

  // Optimistic overlays applied after a successful action; the server data
  // takes over once `router.refresh()` returns the same values.
  const [loginPatch, setLoginPatch] = useState<LoginPatch | null>(null);
  const [devicePatches, setDevicePatches] = useState<Record<string, DevicePatch>>({});
  const [disableOpen, setDisableOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminLinkedDevice | null>(null);
  // Bumped after a successful disable/revoke: the server deletes the sessions of
  // the login / device, so an already opened sessions list must be reloaded.
  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0);

  const login: AdminSupervisedLogin | null = familyAccess.supervised_login
    ? { ...familyAccess.supervised_login, ...(loginPatch ?? {}) }
    : null;
  const devices: AdminLinkedDevice[] = familyAccess.linked_devices.map((device) => ({
    ...device,
    ...(devicePatches[device.linked_device_id] ?? {}),
  }));

  const supervisionLabel = familyAccess.supervision
    ? t(`supervision.${familyAccess.supervision}`)
    : t("supervision.none");

  async function handleDisable(reason: string) {
    const result: AdminDisabledSupervisedLogin = await disableSupervisedLoginFromClient(
      userId,
      reason,
    );
    setLoginPatch({
      status: "disabled",
      disabled_at: result.supervised_login.disabled_at ?? new Date().toISOString(),
      disabled_reason: result.supervised_login.disabled_reason ?? "admin",
    });
    toast.success(t("toasts.disabled"));
    setSessionsRefreshKey((key) => key + 1);
    router.refresh();
  }

  async function handleRevoke(device: AdminLinkedDevice, reason: string) {
    const result: AdminRevokedLinkedDevice = await revokeLinkedDeviceFromClient(
      userId,
      device.linked_device_id,
      reason,
    );
    setDevicePatches((current) => ({
      ...current,
      [device.linked_device_id]: {
        status: "revoked",
        revoked_at: result.revoked_at ?? new Date().toISOString(),
        revoked_reason: result.revoked_reason ?? "admin",
      },
    }));
    toast.success(t("toasts.revoked"));
    setSessionsRefreshKey((key) => key + 1);
    router.refresh();
  }

  return (
    <DetailSection title={t("title")}>
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">{t("description")}</p>

        {/* Supervision is derived from the stored supervised login: a child
            without an own login (e.g. an under-13 with linked devices) has none
            to report, and "Sin supervisión" would be misleading. */}
        {login && (
          <div
            className="flex flex-wrap items-center gap-2 text-sm"
            data-testid="family-supervision"
          >
            <span className="text-xs font-semibold text-muted-foreground">
              {t("supervision.label")}
            </span>
            <Badge variant={familyAccess.supervision === "active" ? "soft-success" : "outline"}>
              {supervisionLabel}
            </Badge>
          </div>
        )}

        <div className="space-y-2" data-testid="family-supervised-login">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xs font-semibold text-muted-foreground">
                {t("login.title")}
              </h4>
              {login && (
                <Badge variant={statusVariant(login.status)}>
                  {t(`login.status.${login.status}`)}
                </Badge>
              )}
            </div>
            {canManage && login && login.status !== "disabled" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={t("login.disableAria")}
                onClick={() => setDisableOpen(true)}
              >
                {t("login.disable")}
              </Button>
            )}
          </div>

          {login ? (
            <DetailCols2>
              <div>
                <DetailField k={t("login.fields.method")} v={t(`login.method.${login.method}`)} />
                <DetailField
                  k={t("login.fields.handle")}
                  v={
                    login.login_handle ? (
                      <code className="font-mono text-xs">{login.login_handle}</code>
                    ) : (
                      DASH
                    )
                  }
                />
                <DetailField k={t("login.fields.origin")} v={t(`login.origin.${login.origin}`)} />
                <DetailField
                  k={t("login.fields.passwordSetBy")}
                  v={t(`login.passwordSetBy.${login.password_set_by}`)}
                />
              </div>
              <div>
                <DetailField
                  k={
                    // For a self-registered teen `enabled_by` is the guardian who
                    // linked them (supervision), not who created the account.
                    login.origin === "self_registered"
                      ? t("login.fields.enabledByGuardian")
                      : t("login.fields.enabledBy")
                  }
                  v={login.enabled_by?.display_name || DASH}
                />
                <DetailField
                  k={t("login.fields.enabledAt")}
                  v={login.enabled_at ? formatDateTime(login.enabled_at) : DASH}
                />
                {login.status === "pending_guardian" && (
                  <DetailField
                    k={t("login.fields.pendingSince")}
                    v={login.pending_since ? formatDateTime(login.pending_since) : DASH}
                  />
                )}
                {login.status === "disabled" && (
                  <>
                    <DetailField
                      k={t("login.fields.disabledAt")}
                      v={login.disabled_at ? formatDateTime(login.disabled_at) : DASH}
                    />
                    <DetailField
                      k={t("login.fields.disabledReason")}
                      v={
                        login.disabled_reason
                          ? t(`login.disabledReason.${login.disabled_reason}`)
                          : DASH
                      }
                    />
                  </>
                )}
              </div>
            </DetailCols2>
          ) : (
            <p className="text-sm text-muted-foreground">{t("login.empty")}</p>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">{t("devices.title")}</h4>
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("devices.empty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                      {t("devices.columns.device")}
                    </TableHead>
                    <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                      {t("devices.columns.pairedBy")}
                    </TableHead>
                    <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                      {t("devices.columns.lastSeen")}
                    </TableHead>
                    <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
                      {t("devices.columns.status")}
                    </TableHead>
                    {canManage && (
                      <TableHead className="h-9 px-3 text-right text-xs font-medium text-muted-foreground">
                        {t("devices.columns.actions")}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => {
                    const revoked = device.status === "revoked";
                    return (
                      <TableRow
                        key={device.linked_device_id}
                        data-testid="family-linked-device"
                        className={revoked ? "bg-muted/30" : undefined}
                      >
                        <TableCell className="px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-2">
                            <Smartphone className="size-4 text-muted-foreground" />
                            <div className="space-y-0.5">
                              <p className="font-medium leading-none">
                                {device.label || DASH}
                              </p>
                              {(device.platform || device.app_version) && (
                                <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                                  {device.platform && (
                                    <span>{t(`devices.platform.${device.platform}`)}</span>
                                  )}
                                  {device.platform && device.app_version && (
                                    <span aria-hidden="true">·</span>
                                  )}
                                  {device.app_version && (
                                    <span>
                                      {t("devices.appVersion", { version: device.app_version })}
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle text-sm">
                          {device.paired_by?.display_name || DASH}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                          <div className="space-y-0.5">
                            <p>{device.last_seen_at ? formatDateTime(device.last_seen_at) : DASH}</p>
                            {device.absolute_expires_at && (
                              <p className="text-xs">
                                {t("devices.expiresOn", {
                                  date: formatDate(device.absolute_expires_at),
                                })}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 align-middle whitespace-nowrap">
                          <div className="space-y-0.5">
                            <Badge variant={revoked ? "destructive" : "soft-success"}>
                              {t(`devices.status.${device.status}`)}
                            </Badge>
                            {revoked && device.revoked_at && (
                              <p className="text-xs text-muted-foreground">
                                {t("devices.revokedOn", { date: formatDate(device.revoked_at) })}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        {canManage && (
                          <TableCell className="px-3 py-2.5 text-right align-middle whitespace-nowrap">
                            {!revoked && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                aria-label={t("devices.revokeAria", { label: device.label })}
                                onClick={() => setRevokeTarget(device)}
                              >
                                {t("devices.revoke")}
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <UserSessionsList
          userId={userId}
          refreshKey={sessionsRefreshKey}
          deviceLabels={Object.fromEntries(
            familyAccess.linked_devices.map((d) => [d.linked_device_id, d.label]),
          )}
        />
      </div>

      {canManage && (
        <ReasonDialog
          open={disableOpen}
          onOpenChange={setDisableOpen}
          title={t("dialog.disableTitle")}
          description={t("dialog.disableDescription")}
          confirmLabel={t("dialog.disableConfirm")}
          onConfirm={handleDisable}
        />
      )}
      {canManage && revokeTarget && (
        <ReasonDialog
          open
          onOpenChange={(open) => {
            if (!open) setRevokeTarget(null);
          }}
          title={t("dialog.revokeTitle")}
          description={t("dialog.revokeDescription", { label: revokeTarget.label })}
          confirmLabel={t("dialog.revokeConfirm")}
          onConfirm={(reason) => handleRevoke(revokeTarget, reason)}
        />
      )}
    </DetailSection>
  );
}
