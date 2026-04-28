"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ShieldAlert,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { INSURANCE_TYPE_LABELS } from "@/lib/api/insurance";
import type { ExpiringInsurance } from "@/lib/api/insurance";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = "days_remaining" | "user_name" | "end_date";
type SortDir = "asc" | "desc";

type KpiData = {
  total: number;
  criticalCount: number;
  thisWeekCount: number;
  thisMonthCount: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OPTIONS = [
  { label: "7 días", value: "7" },
  { label: "15 días", value: "15" },
  { label: "30 días", value: "30" },
  { label: "60 días", value: "60" },
  { label: "90 días", value: "90" },
] as const;

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMemberName(item: ExpiringInsurance): string {
  if (item.user_name) return item.user_name;
  return (
    [item.name, item.paternal_last_name, item.maternal_last_name]
      .filter(Boolean)
      .join(" ") || item.user_id
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getUrgencyStatus(days: number): {
  label: string;
  variant: "destructive" | "warning" | "success" | "outline";
} {
  if (days <= 7) return { label: "Crítico", variant: "destructive" };
  if (days <= 30) return { label: "Advertencia", variant: "warning" };
  return { label: "Vigente", variant: "success" };
}

function getDaysColor(days: number): string {
  if (days <= 7) return "text-destructive font-semibold tabular-nums";
  if (days <= 30) return "text-warning font-medium tabular-nums";
  return "text-success font-medium tabular-nums";
}

function computeKpis(items: ExpiringInsurance[]): KpiData {
  const total = items.length;
  const criticalCount = items.filter((i) => i.days_remaining <= 7).length;
  const thisWeekCount = items.filter(
    (i) => i.days_remaining > 0 && i.days_remaining <= 7,
  ).length;
  const thisMonthCount = items.filter(
    (i) => i.days_remaining > 0 && i.days_remaining <= 30,
  ).length;
  return { total, criticalCount, thisWeekCount, thisMonthCount };
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type KpiCardProps = {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  accent?: "default" | "destructive" | "warning" | "success";
};

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "default",
}: KpiCardProps) {
  const iconColors = {
    default: "text-muted-foreground",
    destructive: "text-destructive",
    warning: "text-warning",
    success: "text-success",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`size-4 shrink-0 ${iconColors[accent]}`} />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">
          {value.toLocaleString("es-MX")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// ─── Table Sort Button ─────────────────────────────────────────────────────────

function SortButton({
  field,
  label,
  current,
  direction,
  onSort,
}: {
  field: SortField;
  label: string;
  current: SortField;
  direction: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = current === field;
  const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      onClick={() => onSort(field)}
    >
      {label}
      <Icon className="size-3" />
    </Button>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

export function ExpiringDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-1 h-7 w-16" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────

type ExpiringDashboardProps = {
  items: ExpiringInsurance[];
  daysAhead: number;
};

export function ExpiringDashboard({ items, daysAhead }: ExpiringDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [sortField, setSortField] = useState<SortField>("days_remaining");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  // ── Filter: days_ahead ────────────────────────────────────────────────────

  function handleDaysChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("days_ahead", value);
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
    setPage(1);
  }

  function handleReset() {
    startTransition(() => {
      router.push(pathname);
    });
    setSortField("days_remaining");
    setSortDir("asc");
    setPage(1);
  }

  // ── Sort ──────────────────────────────────────────────────────────────────

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const kpis = useMemo(() => computeKpis(items), [items]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortField === "days_remaining") {
        cmp = a.days_remaining - b.days_remaining;
      } else if (sortField === "user_name") {
        const na = formatMemberName(a).toLowerCase();
        const nb = formatMemberName(b).toLowerCase();
        cmp = na.localeCompare(nb, "es");
      } else if (sortField === "end_date") {
        const da = a.end_date ? new Date(a.end_date).getTime() : 0;
        const db = b.end_date ? new Date(b.end_date).getTime() : 0;
        cmp = da - db;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isFiltered = daysAhead !== 30;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Vencen en</span>
          <Select
            value={String(daysAhead)}
            onValueChange={handleDaysChange}
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Restablecer
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {items.length === 0
            ? "Sin resultados"
            : `${items.length} ${items.length === 1 ? "seguro" : "seguros"} encontrado${items.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total en ventana"
          value={kpis.total}
          description={`Vencen en los próximos ${daysAhead} días`}
          icon={ShieldAlert}
        />
        <KpiCard
          title="Críticos"
          value={kpis.criticalCount}
          description="Vencen en 7 días o menos"
          icon={AlertTriangle}
          accent={kpis.criticalCount > 0 ? "destructive" : "default"}
        />
        <KpiCard
          title="Esta semana"
          value={kpis.thisWeekCount}
          description="Vencen en los próximos 7 días"
          icon={Clock}
          accent={kpis.thisWeekCount > 0 ? "warning" : "default"}
        />
        <KpiCard
          title="Este mes"
          value={kpis.thisMonthCount}
          description="Vencen en los próximos 30 días"
          icon={Calendar}
          accent={kpis.thisMonthCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <ShieldOff className="size-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                Sin seguros por vencer
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                No hay seguros activos que venzan en los próximos {daysAhead} días.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortButton
                        field="user_name"
                        label="Miembro"
                        current={sortField}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Club
                      </span>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Tipo
                      </span>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        N° Poliza
                      </span>
                    </TableHead>
                    <TableHead>
                      <SortButton
                        field="end_date"
                        label="Vencimiento"
                        current={sortField}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortButton
                        field="days_remaining"
                        label="Dias"
                        current={sortField}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Estado
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((item) => {
                    const status = getUrgencyStatus(item.days_remaining);
                    return (
                      <TableRow key={item.insurance_id}>
                        <TableCell>
                          <div className="font-medium">{formatMemberName(item)}</div>
                          {item.club_section && (
                            <div className="mt-0.5 text-xs text-muted-foreground md:hidden">
                              {item.club?.name ?? "—"}
                              {item.club_section
                                ? ` · ${item.club_section.name}`
                                : ""}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm">
                            {item.club?.name ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                          {item.club_section && (
                            <div className="text-xs text-muted-foreground">
                              {item.club_section.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {item.insurance_type ? (
                            <span className="text-sm">
                              {INSURANCE_TYPE_LABELS[item.insurance_type] ??
                                item.insurance_type}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="font-mono text-xs text-muted-foreground">
                            {item.policy_number ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm tabular-nums">
                            {formatDate(item.end_date)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={getDaysColor(item.days_remaining)}>
                            {item.days_remaining}d
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando{" "}
                    {Math.min((page - 1) * PAGE_SIZE + 1, items.length)}–
                    {Math.min(page * PAGE_SIZE, items.length)} de {items.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="px-3 text-sm text-muted-foreground">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Back link */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/insurance">
            <ArrowLeft className="mr-1.5 size-4" />
            Volver a Seguros
          </Link>
        </Button>
      </div>
    </div>
  );
}
