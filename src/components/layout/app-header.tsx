"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { GlobalCommandPalette } from "@/components/layout/global-command-palette";
import { ActiveContextChip } from "@/components/layout/active-context-chip";
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

export function AppHeader() {
  const tCmd = useTranslations("nav.commandPalette");
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const shortcut = useSearchShortcutLabel();

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

        <div className="h-4 w-px bg-border shrink-0" />

        <div className="min-w-0 flex-1 overflow-hidden">
          <AppBreadcrumbs />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <ActiveContextChip />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCmdkOpen(true)}
            aria-label={tCmd("searchAriaLabel", { shortcut })}
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <kbd className="pointer-events-none hidden h-5 min-w-5 select-none items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium leading-none text-muted-foreground sm:inline-flex">
              {shortcut}
            </kbd>
          </Button>
          <ThemeToggle />
        </div>
      </header>
      <GlobalCommandPalette open={cmdkOpen} onOpenChange={setCmdkOpen} />
    </>
  );
}
