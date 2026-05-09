"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransfersTable } from "@/components/requests/transfers-table";
import {
  getTransferRequests,
  type TransferRequest,
  type RequestStatus,
} from "@/lib/api/requests";
import { ApiError } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusTab = "ALL" | RequestStatus;

interface TransfersClientPageProps {
  initialRequests: TransferRequest[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransfersClientPage({ initialRequests }: TransfersClientPageProps) {
  const t = useTranslations("requests");
  const [activeTab, setActiveTab] = useState<StatusTab>("PENDING");

  const {
    data: requests = [],
    isFetching: isRefreshing,
    refetch,
  } = useQuery<TransferRequest[], Error>({
    queryKey: ["requests", "transfers"],
    queryFn: () => getTransferRequests(),
    initialData: initialRequests,
    staleTime: 60_000,
  });

  const filteredRequests =
    activeTab === "ALL"
      ? requests
      : requests.filter((r) => r.status === activeTab);

  const handleRefresh = async () => {
    const result = await refetch();
    if (result.error) {
      const message =
        result.error instanceof ApiError
          ? result.error.message
          : t("errors.refresh");
      toast.error(message);
    }
  };

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
          {t("client.count", { count: filteredRequests.length })}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {t("client.refresh")}
        </Button>
      </div>

      {/* Status tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusTab)}>
        <div className="overflow-x-auto border-b border-border">
          <TabsList variant="line" className="gap-4">
            <TabsTrigger value="ALL" className="whitespace-nowrap">
              {t("client.tabs.all")}
              {tabBadge(requests.length)}
            </TabsTrigger>
            <TabsTrigger value="PENDING" className="whitespace-nowrap">
              {t("client.tabs.pending")}
              {tabBadge(pendingCount)}
            </TabsTrigger>
            <TabsTrigger value="APPROVED" className="whitespace-nowrap">
              {t("client.tabs.approved")}
              {tabBadge(approvedCount)}
            </TabsTrigger>
            <TabsTrigger value="REJECTED" className="whitespace-nowrap">
              {t("client.tabs.rejected")}
              {tabBadge(rejectedCount)}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <TransfersTable requests={filteredRequests} onRefresh={handleRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
