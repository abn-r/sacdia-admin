"use client";

import { useState, useMemo } from "react";
import { Pencil, Trash2, ExternalLink, ShieldCheck, Shield, ShieldAlert } from "lucide-react";
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
import {
  SortableHeader,
  type SortDirection,
} from "@/components/shared/sortable-header";
import { INSURANCE_TYPE_LABELS } from "@/lib/api/insurance";
import type { MemberInsurance, InsuranceType } from "@/lib/api/insurance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function memberFullName(member: MemberInsurance): string {
  const parts = [member.name, member.paternal_last_name, member.maternal_last_name].filter(Boolean);
  return parts.join(" ") || "Sin nombre";
}

function insuranceTypeBadge(type: InsuranceType | null | undefined) {
  if (!type) return <Badge variant="outline">—</Badge>;

  const variants: Record<InsuranceType, "default" | "secondary" | "destructive"> = {
    GENERAL_ACTIVITIES: "default",
    CAMPOREE: "secondary",
    HIGH_RISK: "destructive",
  };

  const icons: Record<InsuranceType, React.ReactNode> = {
    GENERAL_ACTIVITIES: <Shield className="size-3" />,
    CAMPOREE: <ShieldCheck className="size-3" />,
    HIGH_RISK: <ShieldAlert className="size-3" />,
  };

  return (
    <Badge variant={variants[type]} className="gap-1">
      {icons[type]}
      {INSURANCE_TYPE_LABELS[type]}
    </Badge>
  );
}

function isExpired(endDate: string | null | undefined): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

// ─── Sort types ───────────────────────────────────────────────────────────────

type SortField =
  | "member_name"
  | "insurance_type"
  | "provider"
  | "end_date"
  | "coverage_amount"
  | "active";

// ─── Props ────────────────────────────────────────────────────────────────────

interface InsuranceTableProps {
  items: MemberInsurance[];
  onEdit?: (member: MemberInsurance) => void;
  onDelete?: (member: MemberInsurance) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InsuranceTable({ items, onEdit, onDelete }: InsuranceTableProps) {
  const [sortField, setSortField] = useState<SortField>("member_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "member_name": {
          const aName = memberFullName(a);
          const bName = memberFullName(b);
          return aName.localeCompare(bName) * dir;
        }
        case "insurance_type": {
          const aType = a.insurance?.insurance_type ?? "";
          const bType = b.insurance?.insurance_type ?? "";
          return aType.localeCompare(bType) * dir;
        }
        case "provider": {
          const aProv = a.insurance?.provider ?? "";
          const bProv = b.insurance?.provider ?? "";
          return aProv.localeCompare(bProv) * dir;
        }
        case "end_date": {
          const aDate = a.insurance?.end_date ? new Date(a.insurance.end_date).getTime() : 0;
          const bDate = b.insurance?.end_date ? new Date(b.insurance.end_date).getTime() : 0;
          return (aDate - bDate) * dir;
        }
        case "coverage_amount": {
          const aCov = a.insurance?.coverage_amount ?? 0;
          const bCov = b.insurance?.coverage_amount ?? 0;
          return (aCov - bCov) * dir;
        }
        case "active": {
          const aAct = a.insurance?.active ? 1 : 0;
          const bAct = b.insurance?.active ? 1 : 0;
          return (aAct - bAct) * dir;
        }
        default:
          return 0;
      }
    });
  }, [items, sortField, sortDirection]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Sin seguros registrados"
        description="No se encontraron miembros con seguro en esta sección."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="h-9 px-3"
              aria-sort={sortField === "member_name" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
            >
              <SortableHeader field="member_name" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                Miembro
              </SortableHeader>
            </TableHead>
            <TableHead
              className="h-9 px-3"
              aria-sort={sortField === "insurance_type" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
            >
              <SortableHeader field="insurance_type" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                Tipo
              </SortableHeader>
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              N° Póliza
            </TableHead>
            <TableHead
              className="h-9 px-3"
              aria-sort={sortField === "provider" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
            >
              <SortableHeader field="provider" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                Aseguradora
              </SortableHeader>
            </TableHead>
            <TableHead
              className="h-9 px-3"
              aria-sort={sortField === "end_date" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
            >
              <SortableHeader field="end_date" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                Vigencia
              </SortableHeader>
            </TableHead>
            <TableHead
              className="h-9 px-3"
              aria-sort={sortField === "coverage_amount" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
            >
              <SortableHeader field="coverage_amount" activeField={sortField} direction={sortDirection} onSort={handleSort} align="right">
                Cobertura
              </SortableHeader>
            </TableHead>
            <TableHead
              className="h-9 px-3"
              aria-sort={sortField === "active" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
            >
              <SortableHeader field="active" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                Estado
              </SortableHeader>
            </TableHead>
            <TableHead className="h-9 w-32 px-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.map((member) => {
            const ins = member.insurance;
            const expired = isExpired(ins?.end_date);

            return (
              <TableRow key={member.user_id} className="hover:bg-muted/30">
                {/* Member */}
                <TableCell className="px-3 py-2.5 align-middle">
                  <div>
                    <span className="font-medium">{memberFullName(member)}</span>
                    {member.current_class?.name && (
                      <p className="text-xs text-muted-foreground">{member.current_class.name}</p>
                    )}
                  </div>
                </TableCell>

                {/* Type */}
                <TableCell className="px-3 py-2.5 align-middle">
                  {insuranceTypeBadge(ins?.insurance_type)}
                </TableCell>

                {/* Policy number */}
                <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                  {ins?.policy_number ?? "—"}
                </TableCell>

                {/* Provider */}
                <TableCell className="max-w-[140px] px-3 py-2.5 align-middle">
                  <span className="truncate text-sm text-muted-foreground">
                    {ins?.provider ?? "—"}
                  </span>
                </TableCell>

                {/* Dates */}
                <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                  {ins ? (
                    <span className={expired ? "text-destructive" : undefined}>
                      {formatDate(ins.start_date)} — {formatDate(ins.end_date)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Coverage */}
                <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                  {formatCurrency(ins?.coverage_amount)}
                </TableCell>

                {/* Status */}
                <TableCell className="px-3 py-2.5 align-middle">
                  {!ins ? (
                    <Badge variant="outline">Sin seguro</Badge>
                  ) : expired ? (
                    <Badge variant="destructive">Vencido</Badge>
                  ) : ins.active ? (
                    <Badge variant="soft-success">Vigente</Badge>
                  ) : (
                    <Badge variant="outline">Inactivo</Badge>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="px-3 py-2.5 align-middle">
                  <div className="flex items-center gap-1">
                    {/* Evidence link */}
                    {ins?.evidence_file_url && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        asChild
                        title="Ver evidencia"
                      >
                        <a href={ins.evidence_file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" />
                          <span className="sr-only">Ver evidencia</span>
                        </a>
                      </Button>
                    )}

                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(member)}
                        title={ins ? "Editar seguro" : "Registrar seguro"}
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Editar</span>
                      </Button>
                    )}

                    {onDelete && ins && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(member)}
                        title="Desactivar seguro"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Desactivar</span>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
