"use client";

import { useState } from "react";
import { UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { removeCamporeeMember } from "@/lib/api/camporees";
import type { CamporeeMember } from "@/lib/api/camporees";

interface CamporeeMembersPanelProps {
  camporeeId: number;
  members: CamporeeMember[];
  onMembersChange: () => void;
}

function InsuranceBadge({ status }: { status?: string | null }) {
  if (!status) {
    return (
      <Badge
        variant="outline"
        className="border-yellow-400/50 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
      >
        Sin seguro
      </Badge>
    );
  }

  const isVerified =
    status.toLowerCase() === "verified" ||
    status.toLowerCase() === "activo" ||
    status.toLowerCase() === "active";

  if (isVerified) {
    return (
      <Badge
        variant="outline"
        className="border-green-400/50 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
      >
        Seguro verificado
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-yellow-400/50 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
    >
      Seguro pendiente
    </Badge>
  );
}

export function CamporeeMembersPanel({
  camporeeId,
  members,
  onMembersChange,
}: CamporeeMembersPanelProps) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  async function handleRemove(userId: string, userName?: string) {
    if (removingUserId) return;
    setRemovingUserId(userId);
    try {
      await removeCamporeeMember(camporeeId, userId);
      toast.success(
        userName
          ? `${userName} fue removido del camporee`
          : "Miembro removido del camporee",
      );
      onMembersChange();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo remover al miembro del camporee";
      toast.error(message);
    } finally {
      setRemovingUserId(null);
    }
  }

  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Sin miembros registrados"
        description="No hay miembros inscritos en este camporee todavía."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Miembro
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Club
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tipo
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Seguro
            </TableHead>
            <TableHead className="h-9 w-20 px-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow
              key={member.user_id}
              className="hover:bg-muted/30"
            >
              <TableCell className="px-3 py-2.5 align-middle">
                <span className="text-sm font-medium">
                  {member.name ?? member.user_id}
                </span>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                {member.club_name ?? "—"}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                {member.camporee_type && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {member.camporee_type === "local" ? "Local" : "Unión"}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <InsuranceBadge status={member.insurance_status} />
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(member.user_id, member.name)}
                  disabled={removingUserId === member.user_id}
                  title="Remover del camporee"
                  className="text-destructive hover:text-destructive"
                >
                  <UserMinus className="size-3.5" />
                  <span className="sr-only">Remover</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
