"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentsTable } from "@/components/requests/assignments-table";
import {
  getAssignmentRequests,
  type AssignmentRequest,
  type RequestStatus,
} from "@/lib/api/requests";
import { ApiError } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusTab = "ALL" | RequestStatus;

interface AssignmentsClientPageProps {
  initialRequests: AssignmentRequest[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssignmentsClientPage({ initialRequests }: AssignmentsClientPageProps) {
  const [activeTab, setActiveTab] = useState<StatusTab>("PENDING");
  const [requests, setRequests] = useState<AssignmentRequest[]>(initialRequests);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isInitialMount = useRef(true);

  const filteredRequests =
    activeTab === "ALL"
      ? requests
      : requests.filter((r) => r.status === activeTab);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const fresh = await getAssignmentRequests();
      setRequests(fresh);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "No se pudo actualizar la lista";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
  }, []);

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  function tabBadge(count: number) {
    if (count === 0) return null;
    return (
      <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {count}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{filteredRequests.length}</span>{" "}
          {filteredRequests.length === 1 ? "solicitud" : "solicitudes"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      {/* Status tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusTab)}>
        <TabsList>
          <TabsTrigger value="ALL">
            Todas
            {tabBadge(requests.length)}
          </TabsTrigger>
          <TabsTrigger value="PENDING">
            Pendientes
            {tabBadge(pendingCount)}
          </TabsTrigger>
          <TabsTrigger value="APPROVED">
            Aprobadas
            {tabBadge(approvedCount)}
          </TabsTrigger>
          <TabsTrigger value="REJECTED">
            Rechazadas
            {tabBadge(rejectedCount)}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <AssignmentsTable requests={filteredRequests} onRefresh={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
