"use client";

import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TeamSectionCard {
  sectionId: number;
  typeName: string;
  memberCount: number;
  active: boolean;
}

interface ClubHubTeamSectionProps {
  sections: TeamSectionCard[];
  onOpenResponsables: (sectionId: number) => void;
  onOpenSections: () => void;
}

export function ClubHubTeamSection({
  sections,
  onOpenResponsables,
  onOpenSections,
}: ClubHubTeamSectionProps) {
  const t = useTranslations("clubs.pages.v2.detail");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">{t("hubTeamTitle")}</CardTitle>
        <CardDescription>{t("hubTeamSubtitle")}</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onOpenSections}>
            <Layers className="size-3.5" />
            {t("hubManageSections")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <button
              key={section.sectionId}
              type="button"
              onClick={() => onOpenResponsables(section.sectionId)}
              className={cn(
                "rounded-xl border bg-background p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/30",
                !section.active && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{section.typeName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {section.memberCount} {t("membersLabel")}
                  </p>
                </div>
                <Badge variant={section.active ? "soft-success" : "outline"}>
                  {section.active ? t("activeLabel") : t("inactiveLabel")}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
