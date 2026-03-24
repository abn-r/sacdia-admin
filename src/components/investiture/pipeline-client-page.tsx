"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineTable, type UserRole } from "@/components/investiture/pipeline-table";
import {
  getPipelineEnrollments,
  type PipelineEnrollment,
  type PipelineStatus,
} from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = PipelineStatus | "ALL";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "SUBMITTED", label: "Enviados" },
  { key: "CLUB_APPROVED", label: "Aprobados club" },
  { key: "COORDINATOR_APPROVED", label: "Aprobados coord." },
  { key: "FIELD_APPROVED", label: "Aprobados campo" },
  { key: "INVESTED", label: "Investidos" },
  { key: "REJECTED", label: "Rechazados" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineClientPageProps {
  initialEnrollments: PipelineEnrollment[];
  userRole: UserRole;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PipelineClientPage({
  initialEnrollments,
  userRole,
}: PipelineClientPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [enrollments, setEnrollments] =
    useState<PipelineEnrollment[]>(initialEnrollments);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const status =
        activeTab === "ALL" ? undefined : (activeTab as PipelineStatus);
      const data = await getPipelineEnrollments(status);
      if (isMounted.current) {
        setEnrollments(data);
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "No se pudo actualizar la lista";
      toast.error(message);
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }
  }, [activeTab]);

  // Reload data on tab change (server returns all on initial load)
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const visibleEnrollments =
    activeTab === "ALL"
      ? enrollments
      : enrollments.filter((e) => e.status === activeTab);

  function countForTab(key: TabKey) {
    if (key === "ALL") return enrollments.length;
    return enrollments.filter((e) => e.status === key).length;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
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
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
      >
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-auto gap-1 rounded-lg bg-muted p-1">
            {TABS.map(({ key, label }) => {
              const count = countForTab(key);
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm"
                >
                  {label}
                  {count > 0 && (
                    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary/10 px-1 text-xs font-semibold text-primary">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {TABS.map(({ key }) => (
          <TabsContent key={key} value={key} className="mt-4">
            <PipelineTable
              enrollments={visibleEnrollments}
              userRole={userRole}
              onRefresh={refresh}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
