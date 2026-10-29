"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityImageCardProps {
  title: string;
  src: string;
  alt: string;
}

/**
 * Image preview of an activity. The URL is a presigned R2 link that can expire
 * or 404, so the whole card is hidden when the image fails to load instead of
 * leaving a broken-image icon with its alt text.
 */
export function ActivityImageCard({ title, src, alt }: ActivityImageCardProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* eslint-disable-next-line @next/next/no-img-element -- backend returns activity.image as a presigned R2 URL */}
        <img
          src={src}
          alt={alt}
          className="max-h-64 rounded-lg object-cover"
          onError={() => setFailedSrc(src)}
        />
      </CardContent>
    </Card>
  );
}
