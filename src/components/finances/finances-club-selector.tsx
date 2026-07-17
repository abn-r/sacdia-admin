"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Layers, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
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
import type { LocalField } from "@/lib/api/geography";
import type { AdminTerritoryScope } from "@/lib/auth/territory-scope";
import { canAdminFilterByLocalField } from "@/lib/auth/territory-scope";
import {
  getFinanceSectionLabel,
  type FinanceClubSection,
} from "@/lib/finances/club-sections";

type ClubOption = {
  club_id: number;
  name: string;
  sections: FinanceClubSection[];
  local_field_id?: number;
};

interface FinancesClubSelectorProps {
  clubs: ClubOption[];
  localFields: LocalField[];
  territoryScope: AdminTerritoryScope;
}

export function FinancesClubSelector({
  clubs,
  localFields,
  territoryScope,
}: FinancesClubSelectorProps) {
  const t = useTranslations("finances.clubSelector");
  const showLocalFieldFilter = canAdminFilterByLocalField(territoryScope);

  const [selectedLocalFieldId, setSelectedLocalFieldId] = useState<number | "all">(
    "all",
  );
  const [selectedClubId, setSelectedClubId] = useState<number | null>(
    clubs.length === 1 ? clubs[0].club_id : null,
  );
  const [selectedSectionId, setSelectedSectionId] = useState<number | "all">(
    "all",
  );

  const filteredClubs = useMemo(() => {
    if (!showLocalFieldFilter || selectedLocalFieldId === "all") {
      return clubs;
    }
    return clubs.filter((club) => club.local_field_id === selectedLocalFieldId);
  }, [clubs, selectedLocalFieldId, showLocalFieldFilter]);

  const selectedClub =
    filteredClubs.find((club) => club.club_id === selectedClubId) ?? null;

  const availableSections = selectedClub?.sections ?? [];

  useEffect(() => {
    if (!selectedClub) {
      setSelectedSectionId("all");
      return;
    }

    if (availableSections.length === 1) {
      setSelectedSectionId(availableSections[0].club_section_id);
      return;
    }

    if (
      selectedSectionId !== "all" &&
      !availableSections.some(
        (section) => section.club_section_id === selectedSectionId,
      )
    ) {
      setSelectedSectionId("all");
    }
  }, [availableSections, selectedClub, selectedSectionId]);

  function handleLocalFieldChange(value: string) {
    const nextLocalFieldId = value === "all" ? "all" : Number(value);
    setSelectedLocalFieldId(nextLocalFieldId);

    const nextClubs =
      nextLocalFieldId === "all"
        ? clubs
        : clubs.filter((club) => club.local_field_id === nextLocalFieldId);

    if (selectedClubId && !nextClubs.some((club) => club.club_id === selectedClubId)) {
      setSelectedClubId(nextClubs.length === 1 ? nextClubs[0].club_id : null);
    }
  }

  function handleClubChange(value: string) {
    setSelectedClubId(Number(value));
    setSelectedSectionId("all");
  }

  function handleSectionChange(value: string) {
    setSelectedSectionId(value === "all" ? "all" : Number(value));
  }

  const clubFilters = (
    <>
      {showLocalFieldFilter && localFields.length > 0 && (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <MapPin className="size-4 text-muted-foreground" />
            {t("localFieldLabel")}
          </Label>
          <Select
            value={
              selectedLocalFieldId === "all"
                ? "all"
                : String(selectedLocalFieldId)
            }
            onValueChange={handleLocalFieldChange}
          >
            <SelectTrigger className="h-9 w-[240px]">
              <SelectValue placeholder={t("localFieldPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("localFieldAll")}</SelectItem>
              {localFields.map((lf) => (
                <SelectItem
                  key={lf.local_field_id}
                  value={String(lf.local_field_id)}
                >
                  {lf.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Building2 className="size-4 text-muted-foreground" />
          {t("label")}
        </Label>
        <Select
          value={selectedClubId?.toString() ?? ""}
          onValueChange={handleClubChange}
          disabled={filteredClubs.length === 0}
        >
          <SelectTrigger className="h-9 w-[240px]">
            <SelectValue placeholder={t("selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {filteredClubs.map((club) => (
              <SelectItem key={club.club_id} value={club.club_id.toString()}>
                {club.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Layers className="size-4 text-muted-foreground" />
          {t("sectionLabel")}
        </Label>
        <Select
          value={
            selectedSectionId === "all" ? "all" : String(selectedSectionId)
          }
          onValueChange={handleSectionChange}
          disabled={!selectedClub || availableSections.length === 0}
        >
          <SelectTrigger className="h-9 w-[240px]">
            <SelectValue placeholder={t("sectionPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {availableSections.length > 1 && (
              <SelectItem value="all">{t("sectionAll")}</SelectItem>
            )}
            {availableSections.map((section) => (
              <SelectItem
                key={section.club_section_id}
                value={String(section.club_section_id)}
              >
                {getFinanceSectionLabel(section)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {!selectedClub ? (
        <>
          <div className="flex flex-wrap items-end gap-3">{clubFilters}</div>
          <EmptyState
            icon={DollarSign}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        </>
      ) : (
        <FinancesDashboard
          clubId={selectedClub.club_id}
          clubName={selectedClub.name}
          sections={availableSections}
          sectionId={selectedSectionId}
          renderLayout={({ toolbar, body }) => (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end gap-3">
                {clubFilters}
                {toolbar}
              </div>
              <div className="space-y-6">{body}</div>
            </div>
          )}
        />
      )}
    </div>
  );
}
