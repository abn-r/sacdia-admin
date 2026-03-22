"use client";

import { useState, useCallback } from "react";
import { UserPlus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CamporeeMembersPanel } from "@/components/camporees/camporee-members-panel";
import { RegisterMemberDialog } from "@/components/camporees/register-member-dialog";
import { listCamporeeMembers } from "@/lib/api/camporees";
import type { CamporeeMember } from "@/lib/api/camporees";

interface CamporeeMembersTabProps {
  camporeeId: number;
  initialMembers: CamporeeMember[];
}

export function CamporeeMembersTab({
  camporeeId,
  initialMembers,
}: CamporeeMembersTabProps) {
  const [members, setMembers] = useState<CamporeeMember[]>(initialMembers);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  const refreshMembers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const payload = await listCamporeeMembers(camporeeId);
      const raw = payload as unknown;
      let list: CamporeeMember[] = [];
      if (Array.isArray(raw)) {
        list = raw as CamporeeMember[];
      } else if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        if (Array.isArray(r.data)) {
          list = r.data as CamporeeMember[];
        }
      }
      setMembers(list);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la lista de miembros";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [camporeeId]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{members.length}</span>{" "}
          {members.length === 1 ? "miembro inscrito" : "miembros inscritos"}
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
      />

      <RegisterMemberDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        camporeeId={camporeeId}
        onSuccess={refreshMembers}
      />
    </div>
  );
}
