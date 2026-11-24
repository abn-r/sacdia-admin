"use client";

import { useState } from "react";

interface ActivityImageCardProps {
  title: string;
  src: string;
  alt: string;
}

/**
 * Image preview of an activity: a titled section, not a card. The URL is a
 * presigned R2 link that can expire or 404, so the whole block is hidden when
 * the image fails to load instead of leaving a broken-image icon with its alt text.
 */
export function ActivityImageCard({ title, src, alt }: ActivityImageCardProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {/* eslint-disable-next-line @next/next/no-img-element -- backend returns activity.image as a presigned R2 URL */}
      <img
        src={src}
        alt={alt}
        className="max-h-64 rounded-lg object-cover"
        onError={() => setFailedSrc(src)}
      />
    </section>
  );
}
