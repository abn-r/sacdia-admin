"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (email?.[0] ?? "?").toUpperCase();
}

export function UserAvatar({ src, name, email, size = 40, className }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!src && !imgError;
  const initials = getInitials(name, email);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          src={src}
          alt={name ?? email ?? "Usuario"}
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="select-none font-medium text-muted-foreground"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
