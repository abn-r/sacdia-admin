"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, InformationCircleIcon, Alert02Icon, MultiplicationSignCircleIcon, Loading03Icon } from "@hugeicons/core-free-icons"
import { usePreferencesStore } from "@/stores/preferences/preferences-provider"

const Toaster = ({ ...props }: ToasterProps) => {
  const resolvedThemeMode = usePreferencesStore((state) => state.resolvedThemeMode)

  return (
    <Sonner
      theme={resolvedThemeMode}
      className="toaster group"
      expand={false}
      gap={10}
      visibleToasts={4}
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
        ),
        info: (
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" />
        ),
        warning: (
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />
        ),
        error: (
          <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="size-4" />
        ),
        loading: (
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin motion-reduce:animate-none" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        // Crisp: neutral surface, the hue lives only on the icon (same rule as StatusBadge).
        classNames: {
          toast: "cn-toast",
          success: "[&_[data-icon]]:!text-[color-mix(in_oklch,var(--success),black_15%)] dark:[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-destructive",
          warning: "[&_[data-icon]]:!text-[color-mix(in_oklch,var(--warning),black_25%)] dark:[&_[data-icon]]:!text-warning",
          info: "[&_[data-icon]]:!text-info",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
