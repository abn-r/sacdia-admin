"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listAdminUserSessionsFromClient,
  type AdminUserSession,
} from "@/lib/api/admin-users";
import { useFormatDateTime } from "@/lib/format-locale";

const DASH = "—";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; sessions: AdminUserSession[] }
  | { kind: "error" };

interface UserSessionsListProps {
  userId: string;
  /** Labels of the linked devices of this user, keyed by `linked_device_id`. */
  deviceLabels?: Record<string, string>;
  /**
   * Bump it after an action that deletes sessions server-side (disable a login,
   * revoke a device): an already opened list is reloaded; an unopened one stays
   * idle (it fetches on demand anyway).
   */
  refreshKey?: number;
}

/**
 * Read-only, on-demand list of the active sessions of a user. A session minted
 * by a linked device of a child (`kind: "device"`) is labelled as such, so the
 * admin does not mistake it for the child's own login.
 */
export function UserSessionsList({
  userId,
  deviceLabels = {},
  refreshKey = 0,
}: UserSessionsListProps) {
  const t = useTranslations("familyAccess.sessions");
  const formatDateTime = useFormatDateTime();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function load() {
    setState({ kind: "loading" });
    try {
      setState({ kind: "ready", sessions: await listAdminUserSessionsFromClient(userId) });
    } catch {
      setState({ kind: "error" });
    }
  }

  // Reload when `refreshKey` changes, only if the list was already requested.
  const lastRefreshKey = useRef(refreshKey);
  const opened = state.kind !== "idle";
  useEffect(() => {
    if (lastRefreshKey.current === refreshKey) return;
    lastRefreshKey.current = refreshKey;
    if (opened) void load();
    // `load` only closes over `userId`; re-run strictly on a key change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <div className="space-y-2" data-testid="family-sessions">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-muted-foreground">{t("title")}</h4>
        {state.kind !== "ready" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={state.kind === "loading"}
            onClick={() => void load()}
          >
            {state.kind === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Monitor className="size-4" />
            )}
            {state.kind === "loading"
              ? t("loading")
              : state.kind === "error"
                ? t("retry")
                : t("load")}
          </Button>
        )}
      </div>

      {state.kind === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t("error")}
        </p>
      )}

      {state.kind === "ready" &&
        (state.sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-2">
            {state.sessions.map((session) => {
              const isDevice = session.kind === "device";
              const deviceLabel = session.linkedDeviceId
                ? deviceLabels[session.linkedDeviceId]
                : undefined;
              return (
                <li
                  key={session.sessionId}
                  data-testid="user-session"
                  className="rounded-lg border border-border/60 bg-card p-3"
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant={isDevice ? "soft-info" : "outline"}>
                      {isDevice ? t("deviceBadge") : t("userBadge")}
                    </Badge>
                    {isDevice && deviceLabel && (
                      <span className="text-sm font-medium">
                        {t("linkedDevice", { label: deviceLabel })}
                      </span>
                    )}
                  </div>
                  <dl className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="flex gap-1.5">
                      <dt className="font-semibold">{t("ip")}</dt>
                      <dd>{session.ipAddress ?? DASH}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="font-semibold">{t("agent")}</dt>
                      <dd className="break-all">{session.userAgent ?? DASH}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="font-semibold">{t("createdAt")}</dt>
                      <dd className="tabular-nums">
                        {session.createdAt ? formatDateTime(session.createdAt) : DASH}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="font-semibold">{t("expiresAt")}</dt>
                      <dd className="tabular-nums">
                        {session.expiresAt ? formatDateTime(session.expiresAt) : DASH}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        ))}
    </div>
  );
}
