"use client";

import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

type CertificationRow = {
  certification_id: number;
  name: string;
  description?: string | null;
  duration_weeks?: number | null;
  modules_count?: number | null;
  active?: boolean;
};

interface CertificationsListProps {
  items: CertificationRow[];
}

export function CertificationsList({ items }: CertificationsListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No hay certificaciones"
        description="No se encontraron certificaciones registradas."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Nombre
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Descripción
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Duración
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Módulos
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estado
            </TableHead>
            <TableHead className="h-9 w-12 px-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((cert) => (
            <TableRow key={cert.certification_id} className="hover:bg-muted/30">
              <TableCell className="px-3 py-2.5 align-middle">
                <span className="font-medium">{cert.name}</span>
              </TableCell>
              <TableCell className="max-w-xs px-3 py-2.5 align-middle">
                <span className="truncate text-sm text-muted-foreground">
                  {cert.description ?? "—"}
                </span>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                {cert.duration_weeks != null
                  ? `${cert.duration_weeks} sem.`
                  : "—"}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                {cert.modules_count ?? "—"}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <Badge variant={cert.active !== false ? "default" : "outline"}>
                  {cert.active !== false ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link href={`/dashboard/certifications/${cert.certification_id}`}>
                    <ChevronRight className="size-4" />
                    <span className="sr-only">Ver detalle</span>
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
