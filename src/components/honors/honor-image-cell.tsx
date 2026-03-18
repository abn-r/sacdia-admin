"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_HONORS_IMAGE_BASE_URL = "https://sacdia-files.s3.us-east-1.amazonaws.com";
const DEFAULT_HONORS_IMAGE_FOLDER = "Especialidades";

function normalizeBaseUrl(baseUrl?: string | null): string | null {
  if (!baseUrl) return null;
  const trimmed = baseUrl.trim();
  if (!trimmed) return null;
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function getInitials(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized === "—") {
    return "—";
  }

  const initials = normalized
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return initials || "—";
}

function tryBuildUrl(baseUrl: string, path: string): string | null {
  try {
    return new URL(path.replace(/^\/+/, ""), `${baseUrl}/`).toString();
  } catch {
    return null;
  }
}

function buildImageCandidates(rawImage?: string | null): string[] {
  if (!rawImage || rawImage.trim().length === 0) {
    return [];
  }

  const value = rawImage.trim().replace(/^['"]|['"]$/g, "");
  const normalizedFolder = (
    process.env.NEXT_PUBLIC_HONORS_IMAGE_FOLDER ??
    process.env.NEXT_PUBLIC_HONORS_IMAGE_PREFIX ??
    DEFAULT_HONORS_IMAGE_FOLDER
  ).trim().replace(/^\/+|\/+$/g, "");

  const explicitBaseUrl = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_HONORS_IMAGE_BASE_URL ??
    process.env.NEXT_PUBLIC_FILES_BASE_URL ??
    DEFAULT_HONORS_IMAGE_BASE_URL,
  );
  const apiBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? null);

  const candidates: string[] = [];
  const pushCandidate = (candidate?: string | null) => {
    if (!candidate) return;
    const trimmed = candidate.trim();
    if (!trimmed) return;
    if (!candidates.includes(trimmed)) {
      candidates.push(trimmed);
    }
  };

  const buildFileNameVariants = (fileName: string): string[] => {
    const hasKnownImageExtension = /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(fileName);
    if (hasKnownImageExtension) return [fileName];
    return [fileName, `${fileName}.png`, `${fileName}.jpg`, `${fileName}.jpeg`, `${fileName}.gif`];
  };

  if (/^(https?:\/\/|data:|blob:)/i.test(value)) {
    if (value.toLowerCase().startsWith("http")) {
      try {
        const url = new URL(value);
        const segments = url.pathname.split("/").filter(Boolean);
        const fileName = segments.at(-1);

        if (fileName && segments.length === 1 && normalizedFolder) {
          const fileNameVariants = buildFileNameVariants(fileName);
          for (const variant of fileNameVariants) {
            const candidateUrl = new URL(url.toString());
            candidateUrl.pathname = `/${normalizedFolder}/${variant}`;
            pushCandidate(candidateUrl.toString());
          }
        }
      } catch {
        // Si no se puede parsear, mantenemos el valor original.
      }
    }

    pushCandidate(value);
    return candidates;
  }

  if (/^[\w.-]+\.amazonaws\.com\//i.test(value)) {
    pushCandidate(`https://${value}`);
  }

  const path = value.replace(/\\/g, "/").replace(/^\/+/, "");
  const fileName = path.split("/").filter(Boolean).at(-1) ?? path;
  const fileNameVariants = buildFileNameVariants(fileName);
  const hasSlash = path.includes("/");

  const baseUrls = [explicitBaseUrl, apiBaseUrl].filter((entry): entry is string => !!entry);
  for (const baseUrl of baseUrls) {
    if (!hasSlash && normalizedFolder) {
      for (const variant of fileNameVariants) {
        pushCandidate(tryBuildUrl(baseUrl, `${normalizedFolder}/${variant}`));
      }
    }
    pushCandidate(tryBuildUrl(baseUrl, path));
  }

  pushCandidate(path);
  return candidates;
}

type HonorImageCellProps = {
  name: string;
  rawImage?: string | null;
  nameHref?: string;
  showName?: boolean;
  sizeClassName?: string;
};

export function HonorImageCell({
  name,
  rawImage,
  nameHref,
  showName = true,
  sizeClassName = "h-10 w-14",
}: HonorImageCellProps) {
  const imageCandidates = useMemo(() => buildImageCandidates(rawImage), [rawImage]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const activeSrc = imageCandidates[candidateIndex];
  const hasMoreCandidates = candidateIndex < imageCandidates.length - 1;
  const initials = getInitials(name);

  return (
    <div className={cn("flex min-w-0 items-center", showName && "gap-2")}>
      <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/50", sizeClassName)}>
        {activeSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={activeSrc}
            src={activeSrc}
            alt={name}
            className="h-full w-full object-contain p-0.5"
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setIsLoaded(false);
              if (hasMoreCandidates) {
                setCandidateIndex((previous) => previous + 1);
              }
            }}
          />
        ) : null}
        {!isLoaded && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-muted-foreground">
            {initials}
          </span>
        )}
      </div>
      {showName && (
        nameHref ? (
          <Link href={nameHref} className="truncate text-sm font-medium hover:underline">
            {name}
          </Link>
        ) : (
          <span className="truncate">{name}</span>
        )
      )}
    </div>
  );
}
