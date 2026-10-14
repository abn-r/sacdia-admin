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

/** @type {Array<{ id: string, severity: "error" | "warn", description: string, test: (line: string) => boolean, allow: (file: string) => boolean }>} */
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
];
