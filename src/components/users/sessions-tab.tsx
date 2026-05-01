"use client";

import React, { useState, useTransition } from "react";
import {
  Monitor,
  Smartphone,
  Globe,
  Clock,
  Trash2,
  RefreshCw,
  Wifi,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { revokeSession, revokeAllSessions, getSessionsFromClient } from "@/lib/api/sessions";
import type { AdminSessionListData, AdminSessionItem } from "@/lib/api/sessions";

// ─── User-agent parsing ──────────────────────────────────────────────────────

type ParsedDevice = {
  browser: string;
  os: string;
  type: "desktop" | "mobile" | "tablet" | "unknown";
};

function parseUserAgent(ua: string | null): ParsedDevice {
  if (!ua || ua.trim() === "") {
    return { browser: "Desconocido", os: "Desconocido", type: "unknown" };
  }

  const lower = ua.toLowerCase();

  // Device type
  const isMobile = /mobile|android(?!.*tablet)|iphone|ipod/.test(lower);
  const isTablet = /tablet|ipad|android(?=.*\d+\.\d+.*tablet)/.test(lower);
  const type: ParsedDevice["type"] = isTablet
    ? "tablet"
    : isMobile
      ? "mobile"
      : "desktop";

  // Browser
  let browser = "Desconocido";
  if (/edg\//.test(lower)) browser = "Edge";
  else if (/opr\/|opera/.test(lower)) browser = "Opera";
  else if (/chrome\//.test(lower) && !/chromium/.test(lower)) browser = "Chrome";
  else if (/firefox\//.test(lower)) browser = "Firefox";
  else if (/safari\//.test(lower) && !/chrome/.test(lower)) browser = "Safari";
  else if (/msie|trident/.test(lower)) browser = "Internet Explorer";

  // OS
  let os = "Desconocido";
  if (/windows/.test(lower)) os = "Windows";
  else if (/macintosh|mac os x/.test(lower)) os = "macOS";
  else if (/android/.test(lower)) os = "Android";
  else if (/iphone|ipad|ipod/.test(lower)) os = "iOS";
  else if (/linux/.test(lower)) os = "Linux";

  return { browser, os, type };
}

function DeviceIcon({
  type,
  className,
}: {
  type: ParsedDevice["type"];
  className?: string;
}) {
  if (type === "mobile" || type === "tablet") {
    return <Smartphone className={cn("size-4", className)} />;
  }
  if (type === "desktop") {
    return <Monitor className={cn("size-4", className)} />;
  }
  return <Globe className={cn("size-4", className)} />;
}

// ─── Date formatting ─────────────────────────────────────────────────────────

function formatRelative(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "Ahora mismo";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHr < 24) return `Hace ${diffHr} h`;
    if (diffDay < 7) return `Hace ${diffDay} d`;

    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatAbsolute(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SessionSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Wifi className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">Sin sesiones activas</p>
      <p className="text-[13px] text-muted-foreground">
        No hay sesiones registradas para este usuario.
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-5 text-destructive" />
      </div>
      <p className="text-sm font-medium">Error al cargar sesiones</p>
      <p className="text-[13px] text-muted-foreground">
        No se pudieron obtener los datos de sesión.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 size-3.5" />
        Reintentar
      </Button>
    </div>
  );
}

// ─── Session row ─────────────────────────────────────────────────────────────

type SessionRowProps = {
  session: AdminSessionItem;
  index: number;
  onRevoke: (sessionId: string) => Promise<void>;
  isRevoking: boolean;
};

function SessionRow({ session, index, onRevoke, isRevoking }: SessionRowProps) {
  const device = parseUserAgent(session.userAgent);
  // Highlight the first session as the most recent (likely current)
  const isCurrent = index === 0;

  return (
    <TableRow className={cn(isCurrent && "bg-primary/5")}>
      {/* Device / Browser */}
      <TableCell>
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              isCurrent ? "bg-primary/10" : "bg-muted",
            )}
          >
            <DeviceIcon
              type={device.type}
              className={cn(
                isCurrent ? "text-primary" : "text-muted-foreground",
              )}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {device.browser} en {device.os}
            </p>
            {isCurrent && (
              <Badge variant="success" className="mt-0.5 text-[10px]">
                Sesión actual
              </Badge>
            )}
          </div>
        </div>
      </TableCell>

      {/* IP Address */}
      <TableCell>
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {session.ipAddress || "—"}
        </span>
      </TableCell>

      {/* Expires at */}
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-3.5 shrink-0" />
          <span title={formatAbsolute(session.expiresAt)}>
            {formatRelative(session.expiresAt)}
          </span>
        </div>
      </TableCell>

      {/* Created at */}
      <TableCell className="text-sm text-muted-foreground">
        {formatAbsolute(session.createdAt)}
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge variant="success">Activa</Badge>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isRevoking}
              title="Revocar sesión"
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revocar sesión</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción cerrará la sesión de{" "}
                <strong>
                  {device.browser} en {device.os}
                </strong>{" "}
                (IP: {session.ipAddress || "desconocida"}). El usuario debera
                iniciar sesion nuevamente en ese dispositivo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => onRevoke(session.sessionId)}
              >
                Revocar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export type SessionsTabProps = {
  /** The target user's ID. Passed as route param to admin session endpoints. */
  userId: string;
  initialData: AdminSessionListData | null;
};

export function SessionsTab({ userId, initialData }: SessionsTabProps) {
  const t = useTranslations("users");
  const [data, setData] = useState<AdminSessionListData | null>(initialData);
  const [error, setError] = useState<string | null>(
    initialData === null ? "load_failed" : null,
  );
  const [isPending, startTransition] = useTransition();
  const [isRevokingAll, startRevokeAllTransition] = useTransition();

  // ─── Refresh ───────────────────────────────────────────────────────────────

  function refresh() {
    setError(null);
    startTransition(async () => {
      try {
        const json = await getSessionsFromClient(userId);
        setData(json);
      } catch {
        setError("load_failed");
      }
    });
  }

  // ─── Revoke single ─────────────────────────────────────────────────────────

  async function handleRevoke(sessionId: string) {
    try {
      await revokeSession(userId, sessionId);
      setData((prev) => {
        if (!prev) return prev;
        const updated = prev.sessions.filter((s) => s.sessionId !== sessionId);
        return { ...prev, sessions: updated, totalSessions: updated.length };
      });
      toast.success(t("toasts.session_revoked"));
    } catch {
      toast.error(t("toasts.session_revoke_failed"));
    }
  }

  // ─── Revoke all ────────────────────────────────────────────────────────────

  function handleRevokeAll() {
    startRevokeAllTransition(async () => {
      try {
        await revokeAllSessions(userId);
        setData((prev) => {
          if (!prev) return prev;
          return { ...prev, sessions: [], totalSessions: 0 };
        });
        toast.success(t("toasts.all_sessions_revoked"));
      } catch {
        toast.error(t("toasts.all_sessions_revoke_failed"));
      }
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const sessions = data?.sessions ?? [];
  const hasMultiple = sessions.length > 1;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base">Sesiones activas</CardTitle>
            {data && (
              <p className="text-[13px] text-muted-foreground">
                {data.totalSessions} {data.totalSessions === 1 ? "sesión activa" : "sesiones activas"}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={refresh}
              disabled={isPending}
              title="Actualizar"
            >
              <RefreshCw
                className={cn("size-3.5", isPending && "animate-spin")}
              />
            </Button>

            {hasMultiple && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRevokingAll || isPending}
                  >
                    <Trash2 className="mr-2 size-3.5" />
                    Revocar todas
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Revocar todas las sesiones
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Se cerrarán todas las{" "}
                      <strong>{sessions.length} sesión(es)</strong>{" "}
                      del usuario. Deberá iniciar sesión nuevamente en todos
                      sus dispositivos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={handleRevokeAll}
                    >
                      Revocar todas
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isPending ? (
            <div className="px-4 pb-4">
              <SessionSkeleton />
            </div>
          ) : error ? (
            <div className="px-4 pb-4">
              <ErrorState onRetry={refresh} />
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-b-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Dispositivo
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      IP
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Expira
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Creada
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Estado
                    </TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session, index) => (
                    <SessionRow
                      key={session.sessionId}
                      session={session}
                      index={index}
                      onRevoke={handleRevoke}
                      isRevoking={isPending || isRevokingAll}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
