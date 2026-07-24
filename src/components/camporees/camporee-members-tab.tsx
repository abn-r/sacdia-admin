"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CamporeeMembersPanel } from "@/components/camporees/camporee-members-panel";
import { RegisterMemberDialog } from "@/components/camporees/register-member-dialog";
import { listCamporeeMembers, listUnionCamporeeMembers } from "@/lib/api/camporees";
import type { CamporeeMember, PaginationMeta } from "@/lib/api/camporees";
import {
  collectCamporeeMemberClubOptions,
  DEFAULT_CAMPOREE_MEMBER_FILTERS,
  enrichCamporeeMembersWithClubProfiles,
  filterCamporeeMembers,
  normalizeCamporeeMembers,
  statusFilterToQuery,
  type CamporeeMemberFilters,
} from "@/lib/camporees/member-display";

const LOCAL_DEFAULT_LIMIT = 50;
const UNION_DEFAULT_LIMIT = 100;

export interface CamporeeMembersTabProps {
  camporeeId: number;
  initialMembers: CamporeeMember[];
  initialMeta?: PaginationMeta;
  isUnionCamporee?: boolean;
  onAfterChange?: () => void;
}

export function CamporeeMembersTab({
  camporeeId,
  initialMembers,
  initialMeta,
  isUnionCamporee = false,
  onAfterChange,
}: CamporeeMembersTabProps) {
  const t = useTranslations("camporees.membersTab");
  const [members, setMembers] = useState<CamporeeMember[]>(
    normalizeCamporeeMembers(initialMembers),
  );
  const [meta, setMeta] = useState<PaginationMeta | undefined>(initialMeta);
  const [page, setPage] = useState(initialMeta?.page ?? 1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [filters, setFilters] = useState<CamporeeMemberFilters>(
    DEFAULT_CAMPOREE_MEMBER_FILTERS,
  );

  const fetchPage = useCallback(
    async (targetPage: number, notify = false) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const fetcher = isUnionCamporee ? listUnionCamporeeMembers : listCamporeeMembers;
        const limit = isUnionCamporee ? UNION_DEFAULT_LIMIT : LOCAL_DEFAULT_LIMIT;
        const status = statusFilterToQuery(filters.status);
        const result = await fetcher(camporeeId, {
          page: targetPage,
          limit,
          ...(status ? { status } : {}),
        });
        const normalized = normalizeCamporeeMembers(result.data);
        const enriched = await enrichCamporeeMembersWithClubProfiles(
          normalized,
          camporeeId,
          isUnionCamporee,
        );
        setMembers(enriched);
        setMeta(result.meta);
        setPage(result.meta.page);
        if (notify) onAfterChange?.();
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : t("loadFailed");
        setLoadError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [camporeeId, filters.status, isUnionCamporee, onAfterChange, t],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const normalized = normalizeCamporeeMembers(initialMembers);
      const enriched = await enrichCamporeeMembersWithClubProfiles(
        normalized,
        camporeeId,
        isUnionCamporee,
      );
      if (!cancelled) setMembers(enriched);
    })();
    return () => {
      cancelled = true;
    };
  }, [camporeeId, initialMembers, isUnionCamporee]);

  const skipStatusFetchRef = useRef(true);
  useEffect(() => {
    if (skipStatusFetchRef.current) {
      skipStatusFetchRef.current = false;
      return;
    }
    void fetchPage(1);
  }, [filters.status, fetchPage]);

  const refreshMembers = useCallback(() => fetchPage(page, true), [fetchPage, page]);

  const filteredMembers = useMemo(
    () => filterCamporeeMembers(members, filters),
    [members, filters],
  );

  const clubOptions = useMemo(
    () => collectCamporeeMemberClubOptions(members),
    [members],
  );

  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? members.length;
  const hasPrev = meta ? meta.hasPreviousPage : false;
  const hasNext = meta ? meta.hasNextPage : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{total}</span>{" "}
          {total === 1 ? t("countSingular") : t("countPlural")}
          {filteredMembers.length !== members.length ? (
            <span className="ml-1">
              · {t("visibleCount", { count: filteredMembers.length })}
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refreshMembers}
            disabled={isLoading}
            title={t("refreshListTitle")}
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">{t("refreshLabel")}</span>
          </Button>
          <Button size="sm" onClick={() => setRegisterOpen(true)}>
            <UserPlus className="size-4" />
            {t("registerMember")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="camporee-members-filter-club">{t("filterClub")}</Label>
          <Select
            value={filters.club}
            onValueChange={(value) =>
              setFilters((current) => ({ ...current, club: value }))
            }
          >
            <SelectTrigger id="camporee-members-filter-club">
              <SelectValue placeholder={t("filterClubAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterClubAll")}</SelectItem>
              {clubOptions.map((club) => (
                <SelectItem key={club} value={club}>
                  {club}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="camporee-members-filter-status">{t("filterStatus")}</Label>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters((current) => ({
                ...current,
                status: value as CamporeeMemberFilters["status"],
              }))
            }
          >
            <SelectTrigger id="camporee-members-filter-status">
              <SelectValue placeholder={t("filterStatusAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterStatusAll")}</SelectItem>
              <SelectItem value="registered">{t("filterStatusRegistered")}</SelectItem>
              <SelectItem value="approved">{t("filterStatusApproved")}</SelectItem>
              <SelectItem value="pending_approval">{t("filterStatusPending")}</SelectItem>
              <SelectItem value="rejected">{t("filterStatusRejected")}</SelectItem>
              <SelectItem value="cancelled">{t("filterStatusCancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="camporee-members-filter-insurance">{t("filterInsurance")}</Label>
          <Select
            value={filters.insurance}
            onValueChange={(value) =>
              setFilters((current) => ({
                ...current,
                insurance: value as CamporeeMemberFilters["insurance"],
              }))
            }
          >
            <SelectTrigger id="camporee-members-filter-insurance">
              <SelectValue placeholder={t("filterInsuranceAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterInsuranceAll")}</SelectItem>
              <SelectItem value="verified">{t("filterInsuranceVerified")}</SelectItem>
              <SelectItem value="pending">{t("filterInsurancePending")}</SelectItem>
              <SelectItem value="none">{t("filterInsuranceNone")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <CamporeeMembersPanel
        camporeeId={camporeeId}
        members={filteredMembers}
        onMembersChange={refreshMembers}
        isUnionCamporee={isUnionCamporee}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {t("pageLabel", { page, totalPages })}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => fetchPage(page - 1)}
              disabled={!hasPrev || isLoading}
              aria-label={t("previousPageAriaLabel")}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => fetchPage(page + 1)}
              disabled={!hasNext || isLoading}
              aria-label={t("nextPageAriaLabel")}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <RegisterMemberDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        camporeeId={camporeeId}
        isUnionCamporee={isUnionCamporee}
        onSuccess={refreshMembers}
      />
    </div>
  );
}
