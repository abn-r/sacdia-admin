import { Suspense } from "react";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { NotificationHistoryTable } from "@/components/notifications/notification-history-table";

interface PageProps {
  searchParams: Promise<{ page?: string; limit?: string }>;
}

export default async function NotificationHistoryPage({ searchParams }: PageProps) {
  await requireAdminUser();

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.max(1, Number(params.limit ?? 20));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de notificaciones"
        description="Registro de todas las notificaciones enviadas."
      />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Cargando historial...</div>}>
        <NotificationHistoryTable page={page} limit={limit} />
      </Suspense>
    </div>
  );
}
