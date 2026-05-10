"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("investiture");

  const TABS: { key: TabKey; label: string }[] = [
    { key: "ALL", label: t("pipeline.tabAll") },
    { key: "SUBMITTED", label: t("pipeline.tabSubmitted") },
    { key: "CLUB_APPROVED", label: t("pipeline.tabClubApproved") },
    { key: "COORDINATOR_APPROVED", label: t("pipeline.tabCoordinatorApproved") },
    { key: "FIELD_APPROVED", label: t("pipeline.tabFieldApproved") },
    { key: "INVESTED", label: t("pipeline.tabInvested") },
    { key: "REJECTED", label: t("pipeline.tabRejected") },
  ];

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
          : t("pipeline.errorRefresh");
      toast.error(message);
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }
  }, [activeTab, t]);

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
            className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {t("pipeline.refresh")}
        </Button>
      </div>

      {/* Status tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
      >
        <div className="overflow-x-auto border-b border-border">
          <TabsList variant="line" className="gap-4">
            {TABS.map(({ key, label }) => {
              const count = countForTab(key);
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="whitespace-nowrap"
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
