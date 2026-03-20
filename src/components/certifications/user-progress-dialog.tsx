"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Loader2, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiRequestFromClient } from "@/lib/api/client";
import { toast } from "sonner";

type SectionProgress = {
  section_id: number;
  title?: string;
  completed: boolean;
  completed_at?: string | null;
  notes?: string | null;
};

type ModuleProgress = {
  module_id: number;
  title?: string;
  sections: SectionProgress[];
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

interface UserProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progressData: UserProgressData | null;
  onProgressUpdated?: () => void;
}

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

function ModuleProgressNode({
  mod,
  userId,
  certificationId,
  onUpdated,
}: {
  mod: ModuleProgress;
  userId: string;
  certificationId: number;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [pendingSectionId, setPendingSectionId] = useState<number | null>(null);

  const completedCount = mod.sections.filter((s) => s.completed).length;
  const totalCount = mod.sections.length;

  function handleToggle(section: SectionProgress) {
    setPendingSectionId(section.section_id);
    startTransition(async () => {
      try {
        await apiRequestFromClient(
          `/certifications/users/${encodeURIComponent(userId)}/certifications/${certificationId}/progress`,
          {
            method: "PATCH",
            body: { section_id: section.section_id, completed: !section.completed },
          },
        );
        toast.success(
          !section.completed
            ? "Sección marcada como completada"
            : "Sección marcada como pendiente",
        );
        onUpdated();
      } catch {
        toast.error("No se pudo actualizar el progreso");
      } finally {
        setPendingSectionId(null);
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{mod.title ?? `Módulo ${mod.module_id}`}</p>
        </div>
        <Badge variant={completedCount === totalCount ? "default" : "secondary"} className="shrink-0">
          {completedCount}/{totalCount}
        </Badge>
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {mod.sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin secciones.</p>
          ) : (
            <ul className="space-y-2">
              {mod.sections.map((section) => {
                const isLoading = isPending && pendingSectionId === section.section_id;
                return (
                  <li
                    key={section.section_id}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5"
                  >
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggle(section)}
                      className={cn(
                        "shrink-0 transition-opacity",
                        isPending && !isLoading && "opacity-50",
                      )}
                      title={section.completed ? "Marcar como pendiente" : "Marcar como completada"}
                    >
                      {isLoading ? (
                        <Loader2 className="size-5 animate-spin text-primary" />
                      ) : section.completed ? (
                        <CheckCircle2 className="size-5 text-success" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", section.completed && "text-muted-foreground line-through")}>
                        {section.title ?? `Sección ${section.section_id}`}
                      </p>
                      {section.completed && section.completed_at && (
                        <p className="text-xs text-muted-foreground">
                          Completada el {formatDate(section.completed_at)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function UserProgressDialog({
  open,
  onOpenChange,
  progressData,
  onProgressUpdated,
}: UserProgressDialogProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleUpdated() {
    setRefreshKey((prev) => prev + 1);
    onProgressUpdated?.();
  }

  const progress = progressData?.progress_percent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Progreso del usuario</DialogTitle>
          {progressData && (
            <DialogDescription asChild>
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex items-center gap-2 text-sm">
                  <User className="size-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {progressData.user_name ?? progressData.user_id}
                  </span>
                  {progressData.user_email && (
                    <span className="text-muted-foreground">— {progressData.user_email}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Inscrito: {formatDate(progressData.enrolled_at)}</span>
                  {progressData.completed_at && (
                    <span>Completado: {formatDate(progressData.completed_at)}</span>
                  )}
                  {progress != null && (
                    <Badge variant={progress === 100 ? "default" : "secondary"}>
                      {Math.round(progress)}% completado
                    </Badge>
                  )}
                </div>
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        {!progressData && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {progressData && progressData.modules.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            No hay módulos de progreso disponibles.
          </p>
        )}

        {progressData && progressData.modules.length > 0 && (
          <div key={refreshKey} className="space-y-3 pt-2">
            {progressData.modules.map((mod) => (
              <ModuleProgressNode
                key={mod.module_id}
                mod={mod}
                userId={progressData.user_id}
                certificationId={progressData.certification_id}
                onUpdated={handleUpdated}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
