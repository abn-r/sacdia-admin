"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";

import { shouldOptimizeImage } from "@/lib/images/optimizable-image";
import { cn } from "@/lib/utils";

export interface CatalogThumbnailProps {
  /** Image URL. Empty / nullish renders the fallback. */
  src?: string | null;
  /** Alt text. Defaults to "" (decorative) because most thumbnails sit next to a text label. */
  alt?: string;
  /** Rendered box in CSS px (square). Drives `width`/`height`, so next/image only emits 1x/2x variants. */
  size: number;
  /** How the image fits the square box. */
  fit?: "contain" | "cover";
  /** Extra classes for the wrapper (rounding, border, margin...). */
  className?: string;
  /**
   * Shown when `src` is empty or the image fails to load.
   * Defaults to a muted rounded box; pass `null` to render an empty box.
   */
  fallback?: ReactNode;
  /** Above-the-fold images only. List rows must stay lazy (default). */
  priority?: boolean;
}

/**
 * Fixed-size thumbnail for catalog assets (honors, class logos, badges...)
 * served through the Next.js image optimizer.
 *
 * Remote sources that cannot or should not be optimized (presigned URLs,
 * blob:/data:, SVG, hosts outside remotePatterns) transparently fall back to
 * the raw URL via `unoptimized`, see `shouldOptimizeImage`.
 */
export function CatalogThumbnail({
  src,
  alt = "",
  size,
  fit = "contain",
  className,
  fallback,
  priority = false,
}: CatalogThumbnailProps) {
  const url = src?.trim() ?? "";
  // Remember which URL failed so a new `src` gets a fresh attempt without an effect.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = url.length > 0 && failedUrl !== url;

  return (
    <span
      className={cn("relative inline-block shrink-0 overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          src={url}
          alt={alt}
          width={size}
          height={size}
          unoptimized={!shouldOptimizeImage(url)}
          priority={priority}
          onError={() => setFailedUrl(url)}
          className={cn(
            "size-full",
            fit === "cover" ? "object-cover" : "object-contain",
          )}
        />
      ) : fallback === undefined ? (
        <span
          aria-hidden="true"
          className="block size-full rounded-md border bg-muted"
        />
      ) : (
        fallback
      )}
    </span>
  );
}
