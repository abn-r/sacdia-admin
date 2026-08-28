import type { ReactNode } from "react";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function clubInitials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((word) => word[0] ?? "")
      .join("")
      .toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface ClubDetailHeroProps {
  name: string;
  isActive: boolean;
  localField?: string;
  district?: string;
  church?: string;
  address?: string;
  sectionNames: string[];
  backHref: string;
  backLabel: string;
  statusActiveLabel: string;
  statusInactiveLabel: string;
  metaLabels: {
    status: string;
    localField: string;
    district: string;
    church: string;
    section: string;
  };
}

export function ClubDetailHero({
  name,
  isActive,
  localField,
  district,
  church,
  address,
  sectionNames,
  backHref,
  backLabel,
  statusActiveLabel,
  statusInactiveLabel,
  metaLabels,
}: ClubDetailHeroProps) {
  return (
    <Card className="gap-4 p-6 sm:p-7">
      <div className="grid items-start gap-6 sm:grid-cols-[112px_1fr_auto]">
        <div
          className="relative flex size-[104px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted"
          aria-hidden
        >
          <span
            className="select-none font-medium text-muted-foreground"
            style={{ fontSize: Math.round(104 * 0.36) }}
          >
            {clubInitials(name)}
          </span>
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[26px]">
            {name}
          </h2>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {localField ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {localField}
              </span>
            ) : null}
            {church ? (
              <>
                <Dot />
                <span>{church}</span>
              </>
            ) : null}
            {address ? (
              <>
                <Dot />
                <span className="truncate">{address}</span>
              </>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/35 p-2.5 sm:gap-3 sm:p-3">
            <MetaChip label={metaLabels.status} tone={isActive ? "success" : "muted"} pulse={isActive}>
              {isActive ? statusActiveLabel : statusInactiveLabel}
            </MetaChip>

            {localField ? (
              <>
                <MetaDivider />
                <MetaChip label={metaLabels.localField} icon={MapPin} tone="primary">
                  {localField}
                </MetaChip>
              </>
            ) : null}

            {district ? (
              <>
                <MetaDivider />
                <MetaChip label={metaLabels.district} tone="primary">
                  {district}
                </MetaChip>
              </>
            ) : null}

            {church ? (
              <>
                <MetaDivider />
                <MetaChip label={metaLabels.church} tone="primary">
                  {church}
                </MetaChip>
              </>
            ) : null}

            {sectionNames.map((sectionName) => (
              <span key={sectionName} className="contents">
                <MetaDivider />
                <MetaChip label={metaLabels.section} icon={Users} tone="neutral">
                  {sectionName}
                </MetaChip>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button asChild variant="outline" size="sm">
            <Link href={backHref} prefetch={false}>
              <ArrowLeft className="size-4" />
              {backLabel}
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Dot() {
  return <span aria-hidden className="size-1 rounded-full bg-border" />;
}

type MetaChipTone = "success" | "primary" | "neutral" | "muted";

const metaChipToneClasses: Record<MetaChipTone, string> = {
  success: "border-primary/20 bg-primary/10 text-primary",
  primary: "border-border/80 bg-background text-foreground shadow-xs",
  neutral: "border-border/60 bg-background/80 text-foreground",
  muted: "border-border bg-muted/60 text-muted-foreground",
};

function MetaChip({
  label,
  icon: Icon,
  tone,
  pulse = false,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  tone: MetaChipTone;
  pulse?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
        metaChipToneClasses[tone],
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0 opacity-80" /> : null}
      {pulse ? (
        <span className="relative flex size-1.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
      ) : null}
      <span className="truncate">
        <span className="font-normal text-muted-foreground">{label}</span>
        <span className="mx-1 text-muted-foreground/50">·</span>
        <span>{children}</span>
      </span>
    </span>
  );
}

function MetaDivider() {
  return (
    <span
      aria-hidden
      className="hidden h-4 w-px shrink-0 bg-border/80 sm:inline-block"
    />
  );
}
