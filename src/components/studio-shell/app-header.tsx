"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { LayoutControls } from "@/components/layout/layout-controls";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ActiveContextChip } from "@/components/layout/active-context-chip";
import { StudioSearchDialog } from "@/components/studio-shell/search-dialog";
import { toV1Path } from "@/lib/v2/route-map";
import { cn } from "@/lib/utils";

function useSearchShortcutLabel(): string {
  const [shortcut, setShortcut] = useState("⌘K");

  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    setShortcut(isMac ? "⌘K" : "Ctrl+K");
  }, []);

  return shortcut;
}

export function StudioAppHeader() {
  const tCmd = useTranslations("nav.commandPalette");
  const tV2 = useTranslations("nav.v2");
  const pathname = usePathname();
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const shortcut = useSearchShortcutLabel();
  const classicHref = toV1Path(pathname);

  useEffect(() => {
    const main = document.getElementById("main");
    const target: HTMLElement | Window = main ?? window;
    const onScroll = () => {
      const y = main ? main.scrollTop : window.scrollY;
      setScrolled(y > 4);
    };
    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 transition-shadow",
          "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-10",
          scrolled && "[html[data-navbar-style=sticky]_&]:shadow-sm",
        )}
      >
        <SidebarTrigger className="-ml-1 shrink-0" />
        <div className="h-4 w-px bg-border shrink-0" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <AppBreadcrumbs />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
            <Link href={classicHref} prefetch={false}>
              {tV2("switchToClassic")}
            </Link>
          </Button>
          <ActiveContextChip />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCmdkOpen(true)}
            aria-label={tCmd("searchAriaLabel", { shortcut })}
            className="hidden gap-2 text-muted-foreground md:inline-flex"
          >
            <Search className="size-4" />
            <span className="text-xs">{shortcut}</span>
          </Button>
          <ThemeToggle />
          <LayoutControls />
        </div>
      </header>
      <StudioSearchDialog open={cmdkOpen} onOpenChange={setCmdkOpen} />
    </>
  );
}

export function PanelVersionToggle({
  variant,
}: {
  variant: "classic" | "studio";
}) {
  const tV2 = useTranslations("nav.v2");
  const pathname = usePathname();

  if (variant === "classic") {
    const studioHref = pathname.startsWith("/dashboard")
      ? `/v2${pathname}`
      : "/v2/dashboard";
    return (
      <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
        <Link href={studioHref} prefetch={false}>
          <Sparkles className="mr-1.5 size-3.5" />
          {tV2("switchToStudio")}
        </Link>
      </Button>
    );
  }

  return null;
}
