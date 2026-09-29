"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, GraduationCap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { InstitutionalRequestStatusBadge } from "@/components/institutional-certificate-requests/institutional-certificate-request-badges";
import type {
  InstitutionalCertificateRequest,
  InstitutionalCertificateRequestStatus,
} from "@/lib/api/institutional-certificate-requests";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const civil = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = civil
    ? new Date(Number(civil[1]), Number(civil[2]) - 1, Number(civil[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

// ─── Component ───────────────────────────────────────────────────────────────

type StatusFilter = InstitutionalCertificateRequestStatus | "all";

const STATUS_FILTERS: Array<[StatusFilter, string]> = [
  ["all", "Todos"],
  ["PENDING_REVIEW", "Pendientes"],
  ["APPROVED", "Aprobadas"],
  ["REJECTED", "Rechazadas"],
];

interface InstitutionalCertificateRequestListPageProps {
  requests: InstitutionalCertificateRequest[];
  total: number;
  detailBasePath?: string;
}

export function InstitutionalCertificateRequestListPage({
  requests,
  total,
  detailBasePath = "/dashboard/institutional-certificate-requests",
}: InstitutionalCertificateRequestListPageProps) {
  const t = useTranslations("institutional_certificate_requests.page");
  const tLabels = useTranslations("institutional_certificate_requests.labels");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const pending = requests.filter((r) => r.status === "PENDING_REVIEW").length;
  const approved = requests.filter((r) => r.status === "APPROVED").length;
  const rejected = requests.filter((r) => r.status === "REJECTED").length;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return requests.filter((req) => {
      if (statusFilter !== "all" && req.status !== statusFilter) return false;
      if (!normalized) return true;
      return [req.applicant_name, req.class_name, req.asset_code, req.request_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(normalized));
    });
  }, [requests, query, statusFilter]);

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Total" value={total} hint="Según API" />
        <KpiCard label="Pendientes" value={pending} hint="Esperando revisión" />
        <KpiCard label="Aprobadas" value={approved} hint="Validación institucional" />
        <KpiCard label="Rechazadas" value={rejected} hint="Solicitudes rechazadas" />
      </div>

      <Card className="py-0">
        <CardHeader className="border-b px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Bandeja institucional GM</CardTitle>
              <p className="text-sm text-muted-foreground">
                Validaciones institucionales de GM-02 y GM-03. La aprobación aquí es validación
                institucional, no inscripción de clase.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-2.5 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar solicitante, clase..."
                  className="pl-8 sm:w-64"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {STATUS_FILTERS.map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={statusFilter === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Clase</TableHead>
                  <TableHead>{tLabels("certificateDate")}</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Bloqueos</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((req) => (
                  <TableRow key={req.request_id}>
                    <TableCell>
                      <div className="font-medium">{req.applicant_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {req.request_id.slice(0, 8).toUpperCase()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{req.class_name}</div>
                      <Badge variant="outline" className="text-xs">
                        {req.asset_code}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(req.completed_at)}
                    </TableCell>
                    <TableCell>
                      <InstitutionalRequestStatusBadge status={req.status} />
                    </TableCell>
                    <TableCell>
                      {req.approval_blockers?.length > 0 ? (
                        <Badge variant="secondary">
                          {req.approval_blockers.length} bloq.
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" asChild>
                        <Link
                          href={`${detailBasePath}/${req.request_id}`}
                          prefetch={false}
                        >
                          Revisar
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 && (
            <div className="p-6">
              <EmptyState
                icon={Search}
                title="Sin resultados"
                description="No hay solicitudes que coincidan con el filtro."
                variant="no-results"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card className="py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-2">
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
