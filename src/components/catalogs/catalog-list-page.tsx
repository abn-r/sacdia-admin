import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { fetchCatalogItems, type CatalogItem } from "@/lib/api/admin-catalogs";
import { requireAdminUser } from "@/lib/auth/session";

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

interface CatalogListPageProps {
  title: string;
  description: string;
  endpoint: string;
  idKey?: string;
  columns?: { key: string; label: string }[];
  readOnly?: boolean;
}

export async function CatalogListPage({
  title,
  description,
  endpoint,
  idKey = "id",
  columns,
  readOnly = false,
}: CatalogListPageProps) {
  await requireAdminUser();
  const result = await fetchCatalogItems(endpoint, idKey);

  const displayColumns = columns ?? [
    { key: "name", label: "Nombre" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description}>
        {readOnly && (
          <Badge variant="outline">Solo lectura</Badge>
        )}
      </PageHeader>

      {!result.available && (
        <EndpointErrorBanner
          state="missing"
          detail={result.error ?? "Endpoint no disponible"}
        />
      )}

      {result.available && result.items.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title={`No hay ${title.toLowerCase()}`}
          description="No se encontraron registros."
        />
      )}

      {result.available && result.items.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">ID</TableHead>
                {displayColumns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((item: CatalogItem) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.id}
                  </TableCell>
                  {displayColumns.map((col) => (
                    <TableCell key={col.key} className="text-sm">
                      {String((item as Record<string, unknown>)[col.key] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Badge variant={item.active !== false ? "default" : "outline"} className="text-xs">
                      {item.active !== false ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {formatDate(item.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
