"use client";

import { useState, useCallback } from "react";
import { UserPlus, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CamporeeMembersPanel } from "@/components/camporees/camporee-members-panel";
import { RegisterMemberDialog } from "@/components/camporees/register-member-dialog";
import { listCamporeeMembers, listUnionCamporeeMembers } from "@/lib/api/camporees";
import type { CamporeeMember, PaginationMeta } from "@/lib/api/camporees";

const LOCAL_DEFAULT_LIMIT = 50;
const UNION_DEFAULT_LIMIT = 100;

interface CamporeeMembersTabProps {
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
  const [members, setMembers] = useState<CamporeeMember[]>(initialMembers);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(initialMeta);
  const [page, setPage] = useState(initialMeta?.page ?? 1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  const fetchPage = useCallback(
    async (targetPage: number, notify = false) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const fetcher = isUnionCamporee ? listUnionCamporeeMembers : listCamporeeMembers;
        const limit = isUnionCamporee ? UNION_DEFAULT_LIMIT : LOCAL_DEFAULT_LIMIT;
        const result = await fetcher(camporeeId, {
          page: targetPage,
          limit,
        });
        setMembers(result.data);
        setMeta(result.meta);
        setPage(result.meta.page);
        if (notify) onAfterChange?.();
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo actualizar la lista de miembros";
        setLoadError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [camporeeId, isUnionCamporee, onAfterChange],
  );

  const refreshMembers = useCallback(() => fetchPage(page, true), [fetchPage, page]);

  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? members.length;
  const hasPrev = meta ? meta.hasPreviousPage : false;
  const hasNext = meta ? meta.hasNextPage : false;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{total}</span>{" "}
          {total === 1 ? "miembro inscrito" : "miembros inscritos"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refreshMembers}
            disabled={isLoading}
            title="Actualizar lista"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">Actualizar</span>
          </Button>
          <Button size="sm" onClick={() => setRegisterOpen(true)}>
            <UserPlus className="mr-2 size-4" />
            Registrar miembro
          </Button>
        </div>
      </div>

      {/* Error */}
      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <CamporeeMembersPanel
        camporeeId={camporeeId}
        members={members}
        onMembersChange={refreshMembers}
        isUnionCamporee={isUnionCamporee}
      />

      {/* Pagination — only shown when there is more than one page */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => fetchPage(page - 1)}
              disabled={!hasPrev || isLoading}
              aria-label="Pagina anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => fetchPage(page + 1)}
              disabled={!hasNext || isLoading}
              aria-label="Pagina siguiente"
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
        onSuccess={refreshMembers}
      />
    </div>
  );
}
