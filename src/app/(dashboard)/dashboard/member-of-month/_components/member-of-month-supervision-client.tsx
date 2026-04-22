"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { EvaluateMemberOfMonthDialog } from "@/components/member-of-month/evaluate-dialog";
import { MONTH_NAMES } from "@/lib/constants";
import type { AdminMomPage, AdminMomItem } from "@/lib/api/member-of-month";
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPeriod(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(date);
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function NotifiedBadge({ notified }: { notified: boolean }) {
  if (notified) {
    return <Badge variant="success">Notificado</Badge>;
  }
  return <Badge variant="secondary">Pendiente</Badge>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemberOfMonthSupervisionClientProps {
  initialData: AdminMomPage;
  clubTypes: ClubType[];
  localFields: LocalField[];
  searchParams: {
    club_type_id?: string;
    local_field_id?: string;
    club_id?: string;
    section_id?: string;
    year?: string;
    month?: string;
    notified?: string;
    page?: string;
  };
}

// ─── Evaluate action state ────────────────────────────────────────────────────

type DialogTarget = {
  clubId: number;
  sectionId: number;
  sectionName: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MemberOfMonthSupervisionClient({
  initialData,
  clubTypes,
  localFields,
  searchParams,
}: MemberOfMonthSupervisionClientProps) {
  const router = useRouter();

  const currentPage = Number(searchParams.page ?? "1");
  const { total, limit, items } = initialData;
  const totalPages = Math.ceil(total / limit);

  const [dialogTarget, setDialogTarget] = useState<DialogTarget | null>(null);

  // ─── URL builder ──────────────────────────────────────────────────────────

  function buildUrl(overrides: Record<string, string | undefined>) {
    const next = { ...searchParams, ...overrides };
    const qs = new URLSearchParams();
    for (const [key, val] of Object.entries(next)) {
      if (val !== undefined && val !== "" && val !== "all") {
        qs.set(key, val);
      }
    }
    const queryString = qs.toString();
    return `/dashboard/member-of-month${queryString ? `?${queryString}` : ""}`;
  }

  function handleFilter(key: string, value: string) {
    router.push(buildUrl({ [key]: value === "all" ? undefined : value, page: "1" }));
  }

  function handlePage(newPage: number) {
    router.push(buildUrl({ page: String(newPage) }));
  }

  const monthOptions = Object.entries(MONTH_NAMES).map(([value, label]) => ({
    value,
    label,
  }));

  // ─── Render ───────────────────────────────────────────────────────────────

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
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Notificado */}
        <Select
          value={searchParams.notified ?? "all"}
          onValueChange={(v) => handleFilter("notified", v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Notificado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cualquiera</SelectItem>
            <SelectItem value="true">Notificado</SelectItem>
            <SelectItem value="false">Pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Trophy className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            Sin ganadores para los filtros seleccionados.
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
                <TableHead>Miembro</TableHead>
                <TableHead>Sección</TableHead>
                <TableHead>Tipo de club</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Campo Local</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Puntos</TableHead>
                <TableHead>Notificado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: AdminMomItem) => (
                <TableRow key={item.member_of_month_id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm">
                        {item.user_image && (
                          <AvatarImage
                            src={item.user_image}
                            alt={item.user_name ?? ""}
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {getInitials(item.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {item.user_name ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{item.section_name ?? "—"}</TableCell>
                  <TableCell>{item.club_type ?? "—"}</TableCell>
                  <TableCell>{item.club_name ?? "—"}</TableCell>
                  <TableCell>{item.local_field ?? "—"}</TableCell>
                  <TableCell className="capitalize">
                    {formatPeriod(item.month, item.year)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.total_points.toLocaleString("es-MX")}
                  </TableCell>
                  <TableCell>
                    <NotifiedBadge notified={item.notified} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={item.club_id === null}
                        onClick={() => {
                          if (item.club_id === null) return;
                          setDialogTarget({
                            clubId: item.club_id,
                            sectionId: item.club_section_id,
                            sectionName: item.section_name ?? "sección",
                          });
                        }}
                      >
                        Re-evaluar
                      </Button>
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
              : `${total} ${total === 1 ? "ganador" : "ganadores"} en total`}
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

      {/* Re-evaluate dialog */}
      {dialogTarget !== null && (
        <EvaluateMemberOfMonthDialog
          open={dialogTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDialogTarget(null);
          }}
          clubId={dialogTarget.clubId}
          sectionId={dialogTarget.sectionId}
          sectionName={dialogTarget.sectionName}
          onSuccess={() => {
            setDialogTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
