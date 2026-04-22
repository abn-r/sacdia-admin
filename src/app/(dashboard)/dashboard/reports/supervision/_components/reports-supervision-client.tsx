"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getReportPdfUrl } from "@/lib/api/monthly-reports";
import type { AdminReportsPage, AdminReportItem } from "@/lib/api/monthly-reports";
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS: { value: string; label: string }[] = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: "Borrador" },
  { value: "generated", label: "Generado" },
  { value: "submitted", label: "Enviado" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPeriod(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(date);
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function StatusBadge({ status }: { status: AdminReportItem["status"] }) {
  if (status === "submitted") {
    return <Badge variant="success">Enviado</Badge>;
  }
  if (status === "generated") {
    return <Badge variant="outline">Generado</Badge>;
  }
  return <Badge variant="secondary">Borrador</Badge>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReportsSupervisionClientProps {
  initialData: AdminReportsPage;
  clubTypes: ClubType[];
  localFields: LocalField[];
  searchParams: {
    club_type_id?: string;
    local_field_id?: string;
    year?: string;
    month?: string;
    status?: string;
    page?: string;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportsSupervisionClient({
  initialData,
  clubTypes,
  localFields,
  searchParams,
}: ReportsSupervisionClientProps) {
  const router = useRouter();

  const currentPage = Number(searchParams.page ?? "1");
  const { total, limit, items } = initialData;
  const totalPages = Math.ceil(total / limit);

  // ─── URL builder ────────────────────────────────────────────────────────────

  function buildUrl(overrides: Record<string, string | undefined>) {
    const next = {
      ...searchParams,
      ...overrides,
    };
    const qs = new URLSearchParams();
    for (const [key, val] of Object.entries(next)) {
      if (val !== undefined && val !== "" && val !== "all") {
        qs.set(key, val);
      }
    }
    const queryString = qs.toString();
    return `/dashboard/reports/supervision${queryString ? `?${queryString}` : ""}`;
  }

  function handleFilter(key: string, value: string) {
    router.push(buildUrl({ [key]: value === "all" ? undefined : value, page: "1" }));
  }

  function handlePage(newPage: number) {
    router.push(buildUrl({ page: String(newPage) }));
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Tipo de club */}
        <Select
          value={searchParams.club_type_id ?? "all"}
          onValueChange={(v) => handleFilter("club_type_id", v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipo de club" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {clubTypes.map((ct) => (
              <SelectItem key={ct.club_type_id} value={String(ct.club_type_id)}>
                {ct.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Campo local */}
        <Select
          value={searchParams.local_field_id ?? "all"}
          onValueChange={(v) => handleFilter("local_field_id", v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Campo local" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los campos</SelectItem>
            {localFields.map((lf) => (
              <SelectItem key={lf.local_field_id} value={String(lf.local_field_id)}>
                {lf.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mes */}
        <Select
          value={searchParams.month ?? "all"}
          onValueChange={(v) => handleFilter("month", v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los meses</SelectItem>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Año */}
        <Select
          value={searchParams.year ?? String(new Date().getFullYear())}
          onValueChange={(v) => handleFilter("year", v)}
        >
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
              (y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        {/* Estado */}
        <Select
          value={searchParams.status ?? "all"}
          onValueChange={(v) => handleFilter("status", v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileText className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            No se encontraron reportes
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Ajusta los filtros para ver resultados.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Campo Local</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Generado</TableHead>
                <TableHead>Enviado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.monthly_report_id}>
                  <TableCell className="font-medium">
                    {item.club_name ?? "—"}
                    {item.member_count !== null && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({item.member_count} miembros)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{item.club_type ?? "—"}</TableCell>
                  <TableCell>{item.local_field ?? "—"}</TableCell>
                  <TableCell className="capitalize">
                    {formatPeriod(item.month, item.year)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{formatShortDate(item.generated_at)}</TableCell>
                  <TableCell>{formatShortDate(item.submitted_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/reports/${item.monthly_report_id}`}>
                          Ver
                        </Link>
                      </Button>
                      {item.status !== "draft" && (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={getReportPdfUrl(Number(item.monthly_report_id))}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="mr-1 size-3.5" />
                            PDF
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {items.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total === 0
              ? "Sin resultados"
              : `${total} ${total === 1 ? "reporte" : "reportes"} en total`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePage(currentPage - 1)}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <span className="tabular-nums">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * limit >= total}
              onClick={() => handlePage(currentPage + 1)}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
