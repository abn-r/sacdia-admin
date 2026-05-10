"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const t = useTranslations("nav.themeToggle");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = mounted ? (theme === "system" ? resolvedTheme : theme) : null;
  const isDark = current === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const label = mounted
    ? isDark
      ? t("switchToLight")
      : t("switchToDark")
    : t("switchTheme");

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      title={label}
    >
      <Sun
        className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
        aria-hidden="true"
      />
      <Moon
        className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
        aria-hidden="true"
      />
    </Button>
  );
}
