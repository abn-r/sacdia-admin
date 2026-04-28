"use client";

import { Globe, Check } from "lucide-react";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

const LOCALES: Array<{ code: string; label: string; flag: string }> = [
  { code: "es", label: "Español", flag: "🇲🇽" },
  { code: "pt-BR", label: "Português (Brasil)", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

export function LocaleSwitcherMenu() {
  const current = useLocale();
  const [, startTransition] = useTransition();

  function pick(code: string) {
    if (code === current) return;
    document.cookie = `sacdia_admin_locale=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => window.location.reload());
  }

  const currentLocale = LOCALES.find((l) => l.code === current) ?? LOCALES[0];

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Globe className="mr-2 size-4" />
        <span>{currentLocale.label}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          {LOCALES.map((l) => (
            <DropdownMenuItem key={l.code} onSelect={() => pick(l.code)}>
              <span className="mr-2">{l.flag}</span>
              <span className="flex-1">{l.label}</span>
              {l.code === current && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
