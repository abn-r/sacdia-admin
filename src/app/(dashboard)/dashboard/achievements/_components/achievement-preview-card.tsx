"use client";

import Image from "next/image";
import { EyeOff, Lock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AchievementTier, AchievementType } from "@/lib/api/achievements";

const TIER_COLORS: Record<AchievementTier, { ring: string; label: string; bg: string }> = {
  BRONZE: { ring: "#CD7F32", label: "Bronce", bg: "#CD7F3220" },
  SILVER: { ring: "#C0C0C0", label: "Plata", bg: "#C0C0C020" },
  GOLD: { ring: "#FFD700", label: "Oro", bg: "#FFD70020" },
  PLATINUM: { ring: "#E5E4E2", label: "Platino", bg: "#E5E4E220" },
  DIAMOND: { ring: "#B9F2FF", label: "Diamante", bg: "#B9F2FF20" },
};

const TYPE_LABELS: Record<AchievementType, string> = {
  THRESHOLD: "Umbral",
  STREAK: "Racha",
  COMPOUND: "Compuesto",
  MILESTONE: "Hito",
  COLLECTION: "Colección",
};

interface Props {
  name: string;
  description?: string;
  tier: AchievementTier;
  type: AchievementType;
  points: number;
  secret?: boolean;
  repeatable?: boolean;
  badgeImageUrl?: string | null;
}

export function AchievementPreviewCard({
  name,
  description,
  tier,
  type,
  points,
  secret = false,
  repeatable = false,
  badgeImageUrl,
}: Props) {
  const tierConfig = TIER_COLORS[tier];

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6 text-center shadow-sm transition-all"
      style={{ borderColor: `${tierConfig.ring}40` }}
    >
      {/* Badge image */}
      <div
        className="relative flex size-24 items-center justify-center rounded-full bg-muted"
        style={{
          boxShadow: `0 0 0 3px ${tierConfig.ring}, 0 0 12px ${tierConfig.ring}60`,
        }}
      >
        {badgeImageUrl ? (
          <Image
            src={badgeImageUrl}
            alt={name}
            fill
            className="rounded-full object-cover"
            unoptimized
          />
        ) : (
          <span className="text-3xl" aria-hidden>
            🏆
          </span>
        )}
        {secret && (
          <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted">
            <EyeOff className="size-3.5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="space-y-1">
        <h3 className="text-base font-semibold leading-tight">{name || "Nombre del logro"}</h3>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Tier badge */}
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{
            backgroundColor: tierConfig.bg,
            color: tierConfig.ring,
            border: `1px solid ${tierConfig.ring}40`,
          }}
        >
          {tierConfig.label}
        </span>

        <Badge variant="secondary" className="text-xs">
          {TYPE_LABELS[type]}
        </Badge>

        <Badge variant="default" className="text-xs">
          {points} pts
        </Badge>

        {repeatable && (
          <Badge variant="outline" className="gap-1 text-xs">
            <RefreshCw className="size-3" />
            Repetible
          </Badge>
        )}
        {secret && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Lock className="size-3" />
            Secreto
          </Badge>
        )}
      </div>
    </div>
  );
}
