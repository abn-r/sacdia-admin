#!/usr/bin/env node
/**
 * Generates lucide-react compatibility layer backed by Hugeicons.
 * Run: node scripts/generate-hugeicons-compat.mjs
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as hugeIcons from "@hugeicons/core-free-icons";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "src/lib/icons/lucide-react-compat.tsx");

const iconKeys = new Set(
  Object.keys(hugeIcons).filter(
    (key) => key.endsWith("Icon") && !key.includes("FreeIcons"),
  ),
);

function isValidIconKey(key) {
  return key.endsWith("Icon") && !key.includes("FreeIcons");
}

/** @type {Record<string, string>} */
const MANUAL = {
  Loader2: "Loading03Icon",
  Loader2Icon: "Loading03Icon",
  Loader: "Loading03Icon",
  UploadCloud: "CloudUploadIcon",
  ImageIcon: "Image02Icon",
  Image: "Image02Icon",
  ServerOff: "Database01Icon",
  CheckCircle2: "CheckmarkCircle02Icon",
  TriangleAlertIcon: "Alert02Icon",
  Trash2: "Delete02Icon",
  Trash: "Delete02Icon",
  LayoutDashboard: "DashboardSquare01Icon",
  Settings2: "Settings02Icon",
  Settings: "Settings01Icon",
  Building2: "Building02Icon",
  Plus: "PlusSignIcon",
  X: "MultiplicationSignIcon",
  XIcon: "MultiplicationSignIcon",
  MinusCircle: "MinusSignCircleIcon",
  PlusCircleIcon: "PlusSignCircleIcon",
  MailIcon: "Mail01Icon",
  LogOut: "Logout01Icon",
  TrendingUp: "TradeUpIcon",
  AlertTriangle: "Alert02Icon",
  RefreshCw: "RefreshIcon",
  RefreshCcw: "RefreshIcon",
  Undo2: "Undo02Icon",
  FileText: "File01Icon",
  ScrollText: "File01Icon",
  Trophy: "Award01Icon",
  Medal: "Medal01Icon",
  Sparkles: "SparklesIcon",
  History: "Clock01Icon",
  Forward: "Forward01Icon",
  Send: "SentIcon",
  Filter: "FilterIcon",
  Zap: "ZapIcon",
  ArrowRightLeft: "ArrowLeftRightIcon",
  Link2: "Link02Icon",
  UserCog: "UserSettings01Icon",
  Save: "FloppyDiskIcon",
  BookOpen: "BookOpen01Icon",
  GraduationCap: "GraduationCapIcon",
  PieChart: "PieChart01Icon",
  ClipboardList: "Task01Icon",
  Clock: "Clock01Icon",
  Info: "InformationCircleIcon",
  InfoIcon: "InformationCircleIcon",
  Circle: "RecordIcon",
  OctagonXIcon: "CancelCircleIcon",
  User: "UserIcon",
  Users: "UserGroupIcon",
  UserPlus: "UserAdd01Icon",
  Home: "Home01Icon",
  Search: "Search01Icon",
  Eye: "ViewIcon",
  EyeOff: "ViewOffIcon",
  Pencil: "PencilEdit01Icon",
  MoreHorizontal: "MoreHorizontalIcon",
  MoreHorizontalIcon: "MoreHorizontalIcon",
  ChevronDown: "ArrowDown01Icon",
  ChevronDownIcon: "ArrowDown01Icon",
  ChevronRight: "ArrowRight01Icon",
  ChevronRightIcon: "ArrowRight01Icon",
  ChevronUpIcon: "ArrowUp01Icon",
  CheckIcon: "Tick02Icon",
  Check: "Tick02Icon",
  ArrowUpDown: "ArrowUpDownIcon",
  ChevronsUpDown: "ArrowUpDownIcon",
  ArrowRight: "ArrowRight01Icon",
  ArrowUp: "ArrowUp01Icon",
  ArrowLeft: "ArrowLeft01Icon",
  ChevronLeft: "ArrowLeft01Icon",
  Folder: "Folder01Icon",
  FolderOpen: "FolderOpenIcon",
  FileStack: "StackStarIcon",
  Grid3X3: "GridIcon",
  Landmark: "BankIcon",
  Signpost: "DirectionLeft01Icon",
  Church: "Mosque01Icon",
  Tags: "Tag01Icon",
  Award: "Award01Icon",
  Key: "Key01Icon",
  Shield: "Shield01Icon",
  ShieldCheck: "ShieldEnergyIcon",
  ShieldOff: "ShieldUserIcon",
  Lock: "SquareLock01Icon",
  Sun: "Sun01Icon",
  Moon: "Moon01Icon",
  Monitor: "ComputerIcon",
  Command: "CommandIcon",
  Ellipsis: "MoreHorizontalIcon",
  MessageSquareText: "Message01Icon",
  BarChart3: "BarChartIcon",
  ClipboardEdit: "ClipboardPenIcon",
  Upload: "Upload01Icon",
  LayoutGrid: "LayoutGridIcon",
  FolderPlus: "FolderAddIcon",
  ListChecks: "CheckListIcon",
  RotateCcw: "Rotate01Icon",
  UserX: "UserRemove01Icon",
  XCircle: "CancelCircleIcon",
  ZoomIn: "ZoomInAreaIcon",
  ZoomOut: "ZoomOutAreaIcon",
  ArrowDownIcon: "ArrowDown01Icon",
  SearchIcon: "Search01Icon",
  CheckCircle: "CheckmarkCircle02Icon",
  FileSpreadsheet: "FileSpreadsheetIcon",
  KeyRound: "Key01Icon",
  LockOpen: "SquareUnlock01Icon",
  Mail: "Mail01Icon",
  MailCheck: "MailValidationIcon",
  Phone: "TelephoneIcon",
  ShieldAlert: "ShieldEnergyIcon",
  Smartphone: "SmartPhone01Icon",
  Wifi: "Wifi01Icon",
  Inbox: "InboxIcon",
  Package: "PackageIcon",
  Tag: "Tag01Icon",
  Banknote: "Money01Icon",
  ShoppingBag: "ShoppingBag01Icon",
  Receipt: "Invoice01Icon",
  Truck: "TruckIcon",
  MoreVertical: "MoreVerticalIcon",
  MessageSquare: "Message01Icon",
  Copy: "Copy01Icon",
  Printer: "PrinterIcon",
  Bell: "Notification01Icon",
  Paperclip: "Attachment01Icon",
  UserRound: "UserIcon",
};

function resolveHugeiconName(lucideName) {
  if (MANUAL[lucideName]) {
    const manual = MANUAL[lucideName];
    if (iconKeys.has(manual)) return manual;
  }

  const candidates = [
    `${lucideName}Icon`,
    lucideName,
    `${lucideName}01Icon`,
    `${lucideName}02Icon`,
    `${lucideName}FreeIcons`,
  ];

  for (const candidate of candidates) {
    if (iconKeys.has(candidate)) return candidate;
  }

  const fuzzy = [...iconKeys].find(
    (key) =>
      isValidIconKey(key) &&
      key.replace(/Icon$/, "").toLowerCase() === lucideName.toLowerCase(),
  );
  if (fuzzy) return fuzzy;

  const contains = [...iconKeys].find(
    (key) =>
      isValidIconKey(key) &&
      key.toLowerCase().includes(lucideName.toLowerCase()),
  );
  if (contains) return contains;

  return null;
}

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walkFiles(full, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

function addLucideNames(raw, names) {
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed || trimmed.startsWith("type ")) continue;
    const name = trimmed.split(/\s+as\s+/)[0].trim();
    if (name && /^[A-Za-z][A-Za-z0-9]*$/.test(name)) names.add(name);
  }
}

function collectLucideNames() {
  const names = new Set();
  const files = walkFiles(join(ROOT, "src"));

  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/from\s+["']lucide-react["']/.test(line)) continue;

      const single = line.match(/import\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/);
      if (single) {
        addLucideNames(single[1], names);
        continue;
      }

      const block = [];
      for (let j = i; j >= 0; j--) {
        block.unshift(lines[j]);
        if (/^\s*import\s+\{/.test(lines[j])) break;
      }
      const joined = block.join("\n");
      const multi = joined.match(/import\s+\{([\s\S]+)\}\s+from\s+["']lucide-react["']/);
      if (multi) addLucideNames(multi[1], names);
    }
  }

  return [...names].sort();
}

const lucideNames = collectLucideNames();
/** @type {{ lucide: string, huge: string }[]} */
const mappings = [];
/** @type {string[]} */
const missing = [];

for (const lucideName of lucideNames) {
  const huge = resolveHugeiconName(lucideName);
  if (!huge) {
    missing.push(lucideName);
    continue;
  }
  mappings.push({ lucide: lucideName, huge });
}

if (missing.length > 0) {
  console.warn("Missing Hugeicons mappings:", missing.join(", "));
  process.exitCode = 1;
}

const uniqueHuge = [...new Set(mappings.map((m) => m.huge))].sort();

function hugeImportAlias(name) {
  return `__Huge_${name}`;
}

const file = `/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Lucide-compatible icon exports backed by Hugeicons.
 * Generated by scripts/generate-hugeicons-compat.mjs — do not edit manually.
 */
"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ForwardRefExoticComponent, type RefAttributes } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
${uniqueHuge.map((name) => `  ${name} as ${hugeImportAlias(name)},`).join("\n")}
} from "@hugeicons/core-free-icons";

export type LucideProps = ComponentPropsWithoutRef<"svg"> & {
  size?: number | string;
  absoluteStrokeWidth?: boolean;
};

export type LucideIcon = ForwardRefExoticComponent<
  LucideProps & RefAttributes<SVGSVGElement>
>;

const SIZE_CLASS_MAP: Record<string, number> = {
  "size-2": 8,
  "size-2.5": 10,
  "size-3": 12,
  "size-3.5": 14,
  "size-4": 16,
  "size-5": 20,
  "size-6": 24,
  "size-7": 28,
  "size-8": 32,
  "size-9": 36,
  "size-10": 40,
  "size-12": 48,
};

function resolveIconSize(size?: number | string, className?: string): number {
  if (typeof size === "number") return size;
  if (typeof size === "string") {
    const parsed = Number.parseFloat(size);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (className) {
    for (const [token, px] of Object.entries(SIZE_CLASS_MAP)) {
      if (className.includes(token)) return px;
    }
  }
  return 16;
}

function createLucideIcon(
  iconData: Parameters<typeof HugeiconsIcon>[0]["icon"],
  displayName: string,
): LucideIcon {
  const Component = forwardRef<SVGSVGElement, LucideProps>(function LucideIcon(
    { className, size, color, strokeWidth, absoluteStrokeWidth: _absoluteStrokeWidth, ...props },
    ref,
  ) {
    return (
      <HugeiconsIcon
        ref={ref as never}
        icon={iconData}
        size={resolveIconSize(size, className)}
        color={(color as string | undefined) ?? "currentColor"}
        strokeWidth={typeof strokeWidth === "number" ? strokeWidth : 1.5}
        className={className}
        {...(props as any)}
      />
    );
  });
  Component.displayName = displayName;
  return Component;
}

const ICONS = {
${uniqueHuge.map((name) => `  ${name}: ${hugeImportAlias(name)},`).join("\n")}
} as const;

${mappings
  .map(({ lucide, huge }) => `export const ${lucide} = createLucideIcon(ICONS.${huge}, "${lucide}");`)
  .join("\n")}
`;

mkdirSync(join(ROOT, "src/lib/icons"), { recursive: true });
writeFileSync(OUT, file, "utf8");
console.log(`Generated ${OUT}`);
console.log(`Mapped ${mappings.length} lucide icons to ${uniqueHuge.length} hugeicons.`);
