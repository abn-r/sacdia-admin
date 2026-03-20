"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { FinancesDashboard } from "@/components/finances/finances-dashboard";
import { DollarSign } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClubSection = {
  club_section_id: number;
  club_type_id: number;
  name: string;
  club_type?: { name?: string; slug?: string } | null;
};

type ClubOption = {
  club_id: number;
  name: string;
  sections: ClubSection[];
};

interface FinancesClubSelectorProps {
  clubs: ClubOption[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FinancesClubSelector({ clubs }: FinancesClubSelectorProps) {
  const [selectedClubId, setSelectedClubId] = useState<number | null>(
    clubs.length === 1 ? clubs[0].club_id : null,
  );

  const selectedClub = clubs.find((c) => c.club_id === selectedClubId) ?? null;

  return (
    <div className="space-y-6">
      {/* Club selector */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Building2 className="size-4 text-muted-foreground" />
            Club
          </Label>
          <Select
            value={selectedClubId?.toString() ?? ""}
            onValueChange={(v) => setSelectedClubId(Number(v))}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Seleccioná un club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((club) => (
                <SelectItem key={club.club_id} value={club.club_id.toString()}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {!selectedClub ? (
        <EmptyState
          icon={DollarSign}
          title="Seleccioná un club"
          description="Elegí un club del selector para ver y gestionar sus movimientos financieros."
        />
      ) : (
        <FinancesDashboard
          clubId={selectedClub.club_id}
          clubName={selectedClub.name}
          sections={selectedClub.sections}
        />
      )}
    </div>
  );
}
