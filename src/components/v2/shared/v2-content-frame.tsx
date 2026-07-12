import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Studio-style content frame for v2 feature pages bridged from v1. */
export function V2ContentFrame({
  children,
  className,
  bleed = false,
}: {
  children: ReactNode;
  className?: string;
  bleed?: boolean;
}) {
  return (
    <div
      className={cn(
        bleed ? "space-y-4" : "rounded-xl border bg-card shadow-sm",
        className,
      )}
      data-v2-content-frame
    >
      <div className={cn(!bleed && "p-4 md:p-6")}>{children}</div>
    </div>
  );
}
