"use client";

import { useState } from "react";
import { Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { cancelClubEnrollment } from "@/lib/api/camporees";
import type { CamporeeClub } from "@/lib/api/camporees";

// ─── Status badge ──────────────────────────────────────────────────────────────

function ClubStatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return (
      <Badge variant="secondary" className="text-xs">
        —
      </Badge>
    );
  }

  const normalized = status.toLowerCase();

  if (normalized === "active" || normalized === "activo" || normalized === "enrolled") {
    return (
      <Badge
        variant="outline"
        className="border-green-400/50 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
      >
        Activo
      </Badge>
    );
  }

  if (normalized === "cancelled" || normalized === "cancelado") {
    return (
      <Badge
        variant="outline"
        className="border-destructive/40 bg-destructive/5 text-destructive"
      >
        Cancelado
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs capitalize">
      {status}
    </Badge>
  );
}

// ─── Date helper ───────────────────────────────────────────────────────────────

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

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CamporeeClubsPanelProps {
  camporeeId: number;
  clubs: CamporeeClub[];
  onClubsChange: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CamporeeClubsPanel({
  camporeeId,
  clubs,
  onClubsChange,
}: CamporeeClubsPanelProps) {
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  async function handleCancel(camporeeClubId: number, sectionName?: string | null) {
    if (cancellingId !== null) return;
    setCancellingId(camporeeClubId);
    try {
      await cancelClubEnrollment(camporeeId, camporeeClubId);
      toast.success(
        sectionName
          ? `Inscripción de "${sectionName}" cancelada`
          : "Inscripción de club cancelada",
      );
      onClubsChange();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo cancelar la inscripción del club";
      toast.error(message);
    } finally {
      setCancellingId(null);
    }
  }

  if (clubs.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Sin clubes inscritos"
        description="No hay clubes inscritos en este camporee todavía."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sección
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estado
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Registrado por
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Fecha
            </TableHead>
            <TableHead className="h-9 w-20 px-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {clubs.map((club) => (
            <TableRow key={club.camporee_club_id} className="hover:bg-muted/30">
              <TableCell className="px-3 py-2.5 align-middle">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">
                    {club.section_name ?? `Sección #${club.club_section_id}`}
                  </span>
                  {club.club_name && (
                    <p className="text-xs text-muted-foreground">{club.club_name}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <ClubStatusBadge status={club.status} />
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                {club.registered_by_name ?? club.registered_by ?? "—"}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                {formatDate(club.created_at)}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleCancel(club.camporee_club_id, club.section_name)}
                  disabled={cancellingId === club.camporee_club_id}
                  title="Cancelar inscripción"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Cancelar</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
