"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Building2, Edit3, History, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getClubHistoryFromClient,
  type AuditAction,
  type ClubHistoryItem,
} from "@/lib/api/club-detail";

interface HistoryTabProps {
  clubId: number;
}

export function ClubHistoryTab({ clubId }: HistoryTabProps) {
  const query = useInfiniteQuery({
    queryKey: ["club-detail-history", clubId],
    queryFn: ({ pageParam }) =>
      getClubHistoryFromClient(clubId, {
        limit: 25,
        cursor: pageParam as string | null,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    staleTime: 60_000,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Historial del club</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Eventos auditados desde la creación
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {items.length} eventos cargados
        </span>
      </header>

      {query.isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando historial…
        </div>
      )}

      {query.isError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudo cargar el historial.{" "}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => void query.refetch()}
          >
            Reintentar
          </button>
        </div>
      )}

      {!query.isLoading && !query.isError && items.length === 0 && (
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-12 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
            <History className="size-5" />
          </span>
          <p className="text-sm font-semibold text-foreground">
            Aún sin eventos registrados
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Cuando edites el club, crees secciones o asignes liderazgo, los
            eventos aparecerán aquí en orden cronológico.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <>
          <ol className="relative ml-2 border-l border-border pl-6">
            {items.map((item) => (
              <Row key={item.audit_log_id} item={item} />
            ))}
          </ol>

          {query.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Cargar más
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Row({ item }: { item: ClubHistoryItem }) {
  const tone = ACTION_TONE[item.action];
  const Icon = ENTITY_ICON[item.entity_type] ?? History;
  const created = new Date(item.created_at);
  const dateLabel = formatDateLong(created);
  const timeLabel = created.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const actorName = item.actor
    ? formatActorName(item.actor)
    : "Sistema";

  return (
    <li className="relative pb-5 last:pb-0">
      <span
        className={cn(
          "absolute -left-[33px] grid size-6 place-items-center rounded-full border-4 border-card",
          tone.dot,
        )}
        aria-hidden
      >
        <Icon className="size-3" />
      </span>
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              tone.badge,
            )}
          >
            {ACTION_LABEL[item.action]}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {ENTITY_LABEL[item.entity_type] ?? item.entity_type}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            · {dateLabel} {timeLabel}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground">
          {item.summary ?? `${item.entity_type} ${item.action.toLowerCase()}`}
        </p>
        <p className="text-[11px] text-muted-foreground">Por: {actorName}</p>
      </div>
    </li>
  );
}

const ACTION_TONE: Record<
  AuditAction,
  { dot: string; badge: string }
> = {
  CREATED: {
    dot: "bg-success/15 text-success",
    badge: "bg-success/15 text-success",
  },
  UPDATED: {
    dot: "bg-info/15 text-info",
    badge: "bg-info/15 text-info",
  },
  DELETED: {
    dot: "bg-destructive/15 text-destructive",
    badge: "bg-destructive/15 text-destructive",
  },
};

const ACTION_LABEL: Record<AuditAction, string> = {
  CREATED: "Creado",
  UPDATED: "Actualizado",
  DELETED: "Eliminado",
};

const ENTITY_LABEL: Record<string, string> = {
  club: "Club",
  club_section: "Sección",
  role_assignment: "Liderazgo",
};

const ENTITY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  club: Building2,
  club_section: Edit3,
  role_assignment: Users,
};

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatActorName(actor: {
  name: string | null;
  paternal_last_name: string | null;
}): string {
  const parts = [actor.name, actor.paternal_last_name].filter(Boolean);
  return parts.join(" ").trim() || "Usuario";
}
