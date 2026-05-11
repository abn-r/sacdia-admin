"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { GlobalCommandPalette } from "@/components/layout/global-command-palette";
import { ActiveContextChip } from "@/components/layout/active-context-chip";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
          "sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 transition-shadow",
          scrolled && "shadow-sm",
        )}
      >
        <SidebarTrigger className="-ml-1 shrink-0" />

        {/* Vertical divider */}
        <div className="h-4 w-px bg-border shrink-0" />

        <div className="min-w-0 flex-1 overflow-hidden">
          <AppBreadcrumbs />
        </div>

        {/* Right side: chip de contexto + acciones */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <ActiveContextChip />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCmdkOpen(true)}
            aria-label="Búsqueda global (⌘K)"
            className="text-muted-foreground hover:text-foreground"
          >
            <Search className="size-4" aria-hidden="true" />
            <kbd className="sr-only">⌘K</kbd>
          </Button>
          <ThemeToggle />
        </div>
      </header>
      <GlobalCommandPalette open={cmdkOpen} onOpenChange={setCmdkOpen} />
    </>
  );
}
