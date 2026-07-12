"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  ariaLabel: string;
  size?: "icon-xs" | "icon-sm";
  className?: string;
}

/**
 * Copy-to-clipboard ghost button. Shows a transient check icon on success.
 * Falls back silently if the clipboard API is unavailable.
 */
export function CopyButton({
  text,
  ariaLabel,
  size = "icon-xs",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op — environment without clipboard access
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={copy}
      aria-label={ariaLabel}
      className={cn(
        "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </Button>
  );
}
