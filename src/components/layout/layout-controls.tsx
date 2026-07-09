"use client";

import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  ContentLayout,
  NavbarStyle,
  SidebarCollapsible,
  SidebarVariant,
} from "@/lib/preferences/layout";
import { usePreferences } from "@/lib/preferences/preferences-provider";
import {
  THEME_PRESET_OPTIONS,
  type ThemeMode,
  type ThemePreset,
} from "@/lib/preferences/theme";

export function LayoutControls() {
  const t = useTranslations("nav.layoutControls");
  const { values, resolvedThemeMode, setPreference, resetPreferences } = usePreferences();

  const {
    theme_mode: themeMode,
    theme_preset: themePreset,
    content_layout: contentLayout,
    navbar_style: navbarStyle,
    sidebar_variant: variant,
    sidebar_collapsible: collapsible,
  } = values;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("openAriaLabel")}
          title={t("openAriaLabel")}
        >
          <Settings className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium leading-none">{t("title")}</h4>
            <p className="text-xs text-muted-foreground">{t("description")}</p>
          </div>

          <div className="space-y-3 **:data-[slot=toggle-group]:w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("themePreset")}</Label>
              <Select
                value={themePreset}
                onValueChange={(value: ThemePreset) => setPreference("theme_preset", value)}
              >
                <SelectTrigger size="sm" className="w-full text-xs">
                  <SelectValue placeholder={t("themePreset")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {THEME_PRESET_OPTIONS.map((preset) => (
                      <SelectItem key={preset.value} className="text-xs" value={preset.value}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                resolvedThemeMode === "dark"
                                  ? preset.primary.dark
                                  : preset.primary.light,
                            }}
                          />
                          {preset.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("themeMode")}</Label>
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                type="single"
                value={themeMode}
                onValueChange={(value: ThemeMode | "") => {
                  if (!value) return;
                  setPreference("theme_mode", value);
                }}
              >
                <ToggleGroupItem value="light" aria-label={t("light")}>
                  {t("light")}
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" aria-label={t("dark")}>
                  {t("dark")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("pageLayout")}</Label>
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                type="single"
                value={contentLayout}
                onValueChange={(value: ContentLayout | "") => {
                  if (!value) return;
                  setPreference("content_layout", value);
                }}
              >
                <ToggleGroupItem value="centered" aria-label={t("centered")}>
                  {t("centered")}
                </ToggleGroupItem>
                <ToggleGroupItem value="full-width" aria-label={t("fullWidth")}>
                  {t("fullWidth")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("navbarBehavior")}</Label>
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                type="single"
                value={navbarStyle}
                onValueChange={(value: NavbarStyle | "") => {
                  if (!value) return;
                  setPreference("navbar_style", value);
                }}
              >
                <ToggleGroupItem value="sticky" aria-label={t("sticky")}>
                  {t("sticky")}
                </ToggleGroupItem>
                <ToggleGroupItem value="scroll" aria-label={t("scroll")}>
                  {t("scroll")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("sidebarStyle")}</Label>
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                type="single"
                value={variant}
                onValueChange={(value: SidebarVariant | "") => {
                  if (!value) return;
                  setPreference("sidebar_variant", value);
                }}
              >
                <ToggleGroupItem value="inset" aria-label={t("inset")}>
                  {t("inset")}
                </ToggleGroupItem>
                <ToggleGroupItem value="sidebar" aria-label={t("sidebar")}>
                  {t("sidebar")}
                </ToggleGroupItem>
                <ToggleGroupItem value="floating" aria-label={t("floating")}>
                  {t("floating")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("sidebarCollapse")}</Label>
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                type="single"
                value={collapsible}
                onValueChange={(value: SidebarCollapsible | "") => {
                  if (!value) return;
                  setPreference("sidebar_collapsible", value);
                }}
              >
                <ToggleGroupItem value="icon" aria-label={t("icon")}>
                  {t("icon")}
                </ToggleGroupItem>
                <ToggleGroupItem value="offcanvas" aria-label={t("offcanvas")}>
                  {t("offcanvas")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={resetPreferences}
            >
              {t("restoreDefaults")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
