/**
 * Rules for scripts/audit-design-system.mjs.
 * Each rule is line-based: `test(line)` returns true on a violation and
 * `allow(relativePath)` skips files where the rule does not apply.
 */

const isTestFile = (file) => /\.test\.(?:t|j|mj)sx?$/.test(file);

const TRACKING = String.raw`tracking-(?:wide|wider|widest|\[[^\]\s]+\])`;
const UPPERCASE_RE = /(?:^|[\s"'`])uppercase(?=[\s"'`]|$)/;
const TRACKING_RE = new RegExp(String.raw`(?:^|[\s"'\x60:])${TRACKING}(?=[\s"'\x60]|$)`);
const PILL_RADIUS_RE = /(?:^|[\s"'`:])rounded-(?:3xl|4xl)!?(?=[\s"'`]|$)/;

const SEMANTIC = "(?:success|warning|info|destructive)";
const SEMANTIC_SOLID_BG_RE = new RegExp(String.raw`(?:^|[\s"'\x60:])bg-${SEMANTIC}(?=[\s"'\x60]|$)`);
const TEXT_ON_SOLID_RE = /(?:^|[\s"'`:])text-(?:white|[a-z]+-foreground)(?=[\s"'`]|$)/;
const isTsx = (file) => file.endsWith(".tsx");
const isMonthlyReport = (file) => file.includes("components/reports/monthly-report/");

/**
 * Optional `fileTest(content)` gates a rule per file: when it returns false
 * the rule is skipped for that file (used for file-level conditions).
 * @type {Array<{ id: string, severity: "error" | "warn", description: string, test: (line: string) => boolean, allow: (file: string) => boolean, fileTest?: (content: string) => boolean }>}
 */
export const RULES = [
  {
    id: "h1-font-bold",
    severity: "error",
    description: "h1 must not use font-bold (use PageHeader + font-display font-normal)",
    test: (line) => /<h1\b[^>]*\bfont-bold\b/i.test(line),
    allow: (file) =>
      file.includes("page-header.tsx") ||
      file.endsWith(".test.tsx"),
  },
  {
    id: "h1-font-semibold",
    severity: "warn",
    description: "h1 should use PageHeader or font-display font-normal",
    test: (line) => /<h1\b[^>]*\bfont-semibold\b/i.test(line),
    allow: (file) =>
      file.includes("page-header.tsx") ||
      file.endsWith(".test.tsx"),
  },
  {
    id: "tailwind-palette-bg",
    severity: "warn",
    description: "Prefer semantic tokens over Tailwind palette bg-* colors",
    test: (line) =>
      /\bbg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/.test(
        line,
      ),
    allow: () => false,
  },
  {
    id: "tailwind-palette-text",
    severity: "warn",
    description: "Prefer semantic tokens over Tailwind palette text-* colors",
    test: (line) =>
      /\btext-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/.test(
        line,
      ),
    allow: () => false,
  },
  {
    id: "hardcoded-spanish-ui",
    severity: "warn",
    description: "Possible hardcoded Spanish UI string in JSX props (use next-intl)",
    test: (line) => {
      if (!/^\s*(?:title|description|label|aria-label|placeholder)=/.test(line)) {
        return false;
      }
      if (/useTranslations|getTranslations|\{t\(/.test(line)) return false;
      return /[áéíóúñÁÉÍÓÚÑ¿¡]/.test(line) || /\b(Editar|Eliminar|Volver|Nuevo|No se pudo)\b/.test(line);
    },
    allow: (file) => file.endsWith(".test.tsx"),
  },
  {
    id: "uppercase-tracking",
    severity: "error",
    description: "Labels use sentence case: no uppercase + tracking-* (DESIGN-SYSTEM.md §3.2, antislop R-06)",
    test: (line) => UPPERCASE_RE.test(line) && TRACKING_RE.test(line),
    allow: isTestFile,
  },
  {
    id: "pill-radius",
    severity: "error",
    description: "rounded-3xl/4xl are not in the role-based radius scale (DESIGN-SYSTEM.md §4.1)",
    test: (line) => PILL_RADIUS_RE.test(line),
    allow: isTestFile,
  },
  {
    id: "semantic-text-on-solid",
    severity: "error",
    description: "bg-success/warning/info/destructive with white or *-foreground text: use bg-x-solid",
    test: (line) => SEMANTIC_SOLID_BG_RE.test(line) && TEXT_ON_SOLID_RE.test(line),
    allow: isTestFile,
  },
  {
    id: "text-below-11px",
    severity: "error",
    description: "text-[Npx] below 11px is illegible (use text-2xs or larger)",
    test: (line) =>
      [...line.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].some((m) => Number(m[1]) < 11),
    allow: (file) => isTestFile(file) || isMonthlyReport(file),
  },
  {
    id: "off-scale-text",
    severity: "warn",
    description: "Off-scale text-[10|11|12|14px]: use text-2xs / text-xs / text-sm",
    test: (line) => /text-\[(?:1[01]|12|14)px\]/.test(line),
    allow: (file) => isTestFile(file) || isMonthlyReport(file),
  },
  {
    id: "window-confirm",
    severity: "error",
    description: "Native confirm() is banned: use AlertDialog",
    test: (line) => /\b(?:window|globalThis)\.confirm\(|[!(=]\s*confirm\(/.test(line),
    allow: (file) => !isTsx(file) || isTestFile(file),
  },
  {
    id: "dashed-empty-state",
    severity: "warn",
    description: "border-dashed empty placeholder: use the EmptyState component",
    test: (line) => /\bborder-dashed\b/.test(line),
    fileTest: (content) =>
      /No hay|Sin /.test(content) && !/\bEmptyState\b/.test(content),
    allow: (file) => !isTsx(file) || isTestFile(file),
  },
  {
    id: "hardcoded-pagination",
    severity: "error",
    description: "Hardcoded Anterior/Siguiente pagination text: use next-intl / shared pagination",
    test: (line) => />\s*(?:Anterior|Siguiente)\s*</.test(line),
    allow: (file) => !isTsx(file) || isTestFile(file),
  },
  {
    id: "color-mix-darkening",
    severity: "warn",
    description: "Semantic tokens are text-safe now: use text-x instead of color-mix darkening",
    test: (line) =>
      /color-mix\(in_oklch,var\(--(?:success|warning|info|destructive)\),black/.test(line),
    allow: isTestFile,
  },
  {
    id: "side-stripe",
    severity: "warn",
    description: "Colored side stripes on rows/cards are banned",
    test: (line) => /absolute inset-y-0 left-0 w-\[?[1-4]/.test(line),
    allow: isTestFile,
  },
];
