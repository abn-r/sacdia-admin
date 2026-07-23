"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Radio, Send, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DirectNotificationForm,
  BroadcastNotificationForm,
  ClubNotificationForm,
} from "@/components/notifications/notification-forms";
import { cn } from "@/lib/utils";
import type { NotificationClubTarget } from "@/lib/notifications/club-targets";

export type NotificationComposePermissions = {
  direct: boolean;
  broadcast: boolean;
  club: boolean;
};

type ComposeType = "direct" | "broadcast" | "club";

type NotificationComposeSheetProps = {
  permissions: NotificationComposePermissions;
  clubTargets?: NotificationClubTarget[];
  clubTargetsLoadError?: boolean;
  defaultOpen?: boolean;
  defaultType?: ComposeType;
};

const TYPE_META: Record<
  ComposeType,
  { icon: LucideIcon; titleKey: "direct_title" | "broadcast_title" | "club_title"; descriptionKey: "direct_description" | "broadcast_description" | "club_description" }
> = {
  direct: {
    icon: Send,
    titleKey: "direct_title",
    descriptionKey: "direct_description",
  },
  broadcast: {
    icon: Radio,
    titleKey: "broadcast_title",
    descriptionKey: "broadcast_description",
  },
  club: {
    icon: Users,
    titleKey: "club_title",
    descriptionKey: "club_description",
  },
};

function resolveInitialType(
  permissions: NotificationComposePermissions,
  preferred?: ComposeType,
): ComposeType {
  const available: ComposeType[] = [];
  if (permissions.direct) available.push("direct");
  if (permissions.broadcast) available.push("broadcast");
  if (permissions.club) available.push("club");
  if (preferred && available.includes(preferred)) return preferred;
  return available[0] ?? "direct";
}

function ComposeTypeSelector({
  availableTypes,
  activeType,
  onChange,
}: {
  availableTypes: ComposeType[];
  activeType: ComposeType;
  onChange: (type: ComposeType) => void;
}) {
  const t = useTranslations("configuration.notifications.compose");
  const tForms = useTranslations("notifications.forms");

  return (
    <div
      role="radiogroup"
      aria-label={t("typeLabel")}
      className={cn(
        "grid gap-2",
        availableTypes.length === 2 && "grid-cols-2",
        availableTypes.length === 3 && "grid-cols-3",
      )}
    >
      {availableTypes.map((type) => {
        const meta = TYPE_META[type];
        const Icon = meta.icon;
        const selected = activeType === type;

        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border px-2 py-3 text-center transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out-expo)] motion-reduce:transition-none active:scale-[0.97] motion-reduce:active:scale-100",
              selected
                ? "border-primary bg-primary/5 text-foreground shadow-sm ring-1 ring-primary/20"
                : "border-border/60 bg-muted/20 text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:border-border [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40 [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-md transition-colors",
                selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="text-xs font-medium leading-tight">
              {tForms(meta.titleKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function NotificationComposeSheet({
  permissions,
  clubTargets = [],
  clubTargetsLoadError = false,
  defaultOpen = false,
  defaultType,
}: NotificationComposeSheetProps) {
  const t = useTranslations("configuration.notifications.compose");
  const tForms = useTranslations("notifications.forms");
  const router = useRouter();
  const pathname = usePathname();

  const availableTypes = useMemo(() => {
    const types: ComposeType[] = [];
    if (permissions.direct) types.push("direct");
    if (permissions.broadcast) types.push("broadcast");
    if (permissions.club) types.push("club");
    return types;
  }, [permissions]);

  const [open, setOpen] = useState(defaultOpen);
  const [activeType, setActiveType] = useState<ComposeType>(() =>
    resolveInitialType(permissions, defaultType),
  );
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  useEffect(() => {
    setActiveType(resolveInitialType(permissions, defaultType));
  }, [permissions, defaultType]);

  function clearComposeQuery() {
    router.replace(pathname, { scroll: false });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      clearComposeQuery();
      setFormKey((key) => key + 1);
    }
  }

  function handleSuccess() {
    setOpen(false);
    clearComposeQuery();
    setFormKey((key) => key + 1);
    router.refresh();
  }

  if (availableTypes.length === 0) return null;

  const showTypeSelector = availableTypes.length > 1;
  const activeMeta = TYPE_META[activeType];

  function renderForm(type: ComposeType) {
    switch (type) {
      case "direct":
        return (
          <DirectNotificationForm
            key={`${formKey}-direct`}
            embedded
            onSuccess={handleSuccess}
          />
        );
      case "broadcast":
        return (
          <BroadcastNotificationForm
            key={`${formKey}-broadcast`}
            embedded
            onSuccess={handleSuccess}
          />
        );
      case "club":
        return (
          <ClubNotificationForm
            key={`${formKey}-club`}
            embedded
            clubTargets={clubTargets}
            clubTargetsLoadError={clubTargetsLoadError}
            onSuccess={handleSuccess}
          />
        );
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {t("newButton")}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-5 pr-14">
          <SheetTitle className="text-lg">{t("title")}</SheetTitle>
          <SheetDescription>{tForms(activeMeta.descriptionKey)}</SheetDescription>
        </SheetHeader>

        {showTypeSelector ? (
          <div className="shrink-0 border-b px-6 py-4">
            <p className="mb-3 text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {t("typeLabel")}
            </p>
            <ComposeTypeSelector
              availableTypes={availableTypes}
              activeType={activeType}
              onChange={setActiveType}
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {renderForm(activeType)}
        </div>
      </SheetContent>
    </Sheet>
  );
}
