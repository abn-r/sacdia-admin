"use client";

import { useState } from "react";
import { Users, BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { UserProgressDialog } from "@/components/certifications/user-progress-dialog";
import { apiRequestFromClient } from "@/lib/api/client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type EnrolledUser = {
  user_id: string;
  enrollment_id?: number;
  certification_id: number;
  enrolled_at?: string | null;
  completed_at?: string | null;
  progress_percent?: number | null;
  user?: {
    user_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
};

type ModuleProgress = {
  module_id: number;
  title?: string;
  sections: {
    section_id: number;
    title?: string;
    completed: boolean;
    completed_at?: string | null;
    notes?: string | null;
  }[];
};

type UserProgressData = {
  user_id: string;
  certification_id: number;
  enrolled_at?: string | null;
  completed_at?: string | null;
  progress_percent?: number | null;
  modules: ModuleProgress[];
  user_name?: string;
  user_email?: string;
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getUserDisplayName(user?: EnrolledUser["user"], fallbackId?: string): string {
  if (!user) return fallbackId ?? "—";
  const first = user.first_name?.trim() ?? "";
  const last = user.last_name?.trim() ?? "";
  const full = [first, last].filter(Boolean).join(" ");
  return full || user.email || user.user_id || fallbackId || "—";
}

interface EnrolledUsersPanelProps {
  enrollments: EnrolledUser[];
  certificationId: number;
}

export function EnrolledUsersPanel({ enrollments, certificationId }: EnrolledUsersPanelProps) {
  const t = useTranslations("certifications");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progressData, setProgressData] = useState<UserProgressData | null>(null);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  async function handleViewProgress(enrollment: EnrolledUser) {
    const userId = enrollment.user?.user_id ?? enrollment.user_id;
    setLoadingUserId(userId);
    setProgressData(null);
    setDialogOpen(true);

    try {
      const raw = await apiRequestFromClient<unknown>(
        `/certifications/users/${encodeURIComponent(userId)}/certifications/${certificationId}/progress`,
      );

      const data = normalizeProgressPayload(raw, userId, certificationId, enrollment);
      setProgressData(data);
    } catch {
      toast.error(t("toasts.progress_load_failed"));
      setDialogOpen(false);
    } finally {
      setLoadingUserId(null);
    }
  }

  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Sin usuarios inscritos"
        description="Ningún usuario está inscrito en esta certificación."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Usuario
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Inscripción
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Progreso
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Completado
              </TableHead>
              <TableHead className="h-9 w-12 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => {
              const userId = enrollment.user?.user_id ?? enrollment.user_id;
              const displayName = getUserDisplayName(enrollment.user, userId);
              const email = enrollment.user?.email;
              const progress = enrollment.progress_percent;
              const isLoading = loadingUserId === userId;

              return (
                <TableRow key={`${userId}-${enrollment.certification_id}`} className="hover:bg-muted/30">
                  <TableCell className="px-3 py-2.5 align-middle">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{displayName}</span>
                      {email && (
                        <span className="text-xs text-muted-foreground">{email}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm">
                    {formatDate(enrollment.enrolled_at)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    {progress != null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                          />
                        </div>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    {enrollment.completed_at ? (
                      <Badge variant="default">{formatDate(enrollment.completed_at)}</Badge>
                    ) : (
                      <Badge variant="secondary">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isLoading}
                      onClick={() => handleViewProgress(enrollment)}
                      title="Ver progreso detallado"
                    >
                      <BarChart2 className="size-4" />
                      <span className="sr-only">Ver progreso</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <UserProgressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        progressData={progressData}
        onProgressUpdated={() => {
          // Refresh happens inside the dialog (optimistic local update).
          // A full page refresh is not triggered to avoid losing scroll position.
        }}
      />
    </>
  );
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizeProgressPayload(
  raw: unknown,
  userId: string,
  certificationId: number,
  enrollment: EnrolledUser,
): UserProgressData {
  type AnyRecord = Record<string, unknown>;

  const root = (raw && typeof raw === "object" ? raw : {}) as AnyRecord;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as AnyRecord;

  const modules = normalizeModules(data.modules ?? data.progress ?? []);
  const userName = getUserDisplayName(enrollment.user, userId);
  const userEmail = enrollment.user?.email;

  return {
    user_id: userId,
    certification_id: certificationId,
    enrolled_at: enrollment.enrolled_at,
    completed_at: enrollment.completed_at ?? (typeof data.completed_at === "string" ? data.completed_at : null),
    progress_percent:
      typeof data.progress_percent === "number"
        ? data.progress_percent
        : typeof data.progress === "number"
          ? data.progress
          : enrollment.progress_percent,
    modules,
    user_name: userName,
    user_email: userEmail,
  };
}

function normalizeModules(raw: unknown): ModuleProgress[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((mod: unknown) => {
    type AnyRecord = Record<string, unknown>;
    const m = (mod && typeof mod === "object" ? mod : {}) as AnyRecord;
    const sections = normalizeSections(m.sections ?? []);

    return {
      module_id: typeof m.module_id === "number" ? m.module_id : 0,
      title: typeof m.title === "string" ? m.title : typeof m.name === "string" ? m.name : undefined,
      sections,
    };
  });
}

function normalizeSections(raw: unknown): ModuleProgress["sections"] {
  if (!Array.isArray(raw)) return [];

  return raw.map((sec: unknown) => {
    type AnyRecord = Record<string, unknown>;
    const s = (sec && typeof sec === "object" ? sec : {}) as AnyRecord;

    return {
      section_id: typeof s.section_id === "number" ? s.section_id : 0,
      title: typeof s.title === "string" ? s.title : typeof s.name === "string" ? s.name : undefined,
      completed: s.completed === true,
      completed_at: typeof s.completed_at === "string" ? s.completed_at : null,
      notes: typeof s.notes === "string" ? s.notes : null,
    };
  });
}
