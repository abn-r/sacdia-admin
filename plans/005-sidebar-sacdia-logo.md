# 005 — Replace sidebar Command icon with SACDIA logo

- **Status**: DONE
- **Commit**: 1d5c22b
- **Severity**: MEDIUM
- **Category**: Cohesion (brand)
- **Estimated scope**: 1 file, tiny

## Problem

Sidebar brand slot still uses the Lucide `Command` icon from the shadcn admin template. Login already uses `/svg/LogoSACDIA.svg`. First screen after login looks like a different product.

```tsx
/* src/app/(dashboard)/dashboard/_components/sidebar/app-sidebar.tsx:5-46 — current */
import { Command } from "lucide-react";
/* … */
<SidebarMenuButton asChild>
  <Link prefetch={false} href="/dashboard">
    <Command />
    <span className="font-semibold text-base">{APP_CONFIG.name}</span>
  </Link>
</SidebarMenuButton>
```

## Target

```tsx
/* target — src/app/(dashboard)/dashboard/_components/sidebar/app-sidebar.tsx */
import Image from "next/image";
import Link from "next/link";
/* remove: import { Command } from "lucide-react"; */

<SidebarMenuButton asChild>
  <Link prefetch={false} href="/dashboard" aria-label={APP_CONFIG.name}>
    <Image
      src="/svg/LogoSACDIA.svg"
      alt=""
      width={16}
      height={16}
      className="size-4 shrink-0"
    />
    <span className="font-semibold text-base">{APP_CONFIG.name}</span>
  </Link>
</SidebarMenuButton>
```

Rules:

- Same asset as login: `/svg/LogoSACDIA.svg` (full-color brand; do **not** invert).
- `size-4` so collapsed (`collapsible=icon`) sidebar keeps a 16px mark. Do **not** wrap it in the login `size-10` bordered box — that breaks icon rail.
- `alt=""` + `aria-label={APP_CONFIG.name}` on the link: visible text covers the name when expanded; collapsed mode still announces the target.
- Drop the unused `Command` import.

## Repo conventions to follow

- Login exemplar (asset + next/image): `src/components/auth/login-form.tsx:61-66`:

```tsx
<Image
  src="/svg/LogoSACDIA.svg"
  alt="SACDIA"
  width={22}
  height={22}
  priority
/>
```

Do **not** copy `priority` or `width={22}` — sidebar is not LCP and must stay 16px.

- `SidebarMenuButton` already sizes SVG children (`[&_svg]:size-4`). `next/image` renders `<img>`, so set `className="size-4 shrink-0"` yourself.

## Steps

1. `src/app/(dashboard)/dashboard/_components/sidebar/app-sidebar.tsx` — add `import Image from "next/image";`. Remove `import { Command } from "lucide-react";`.
2. Replace `<Command />` with the `Image` block above. Add `aria-label={APP_CONFIG.name}` on the `Link`.
3. Leave `APP_CONFIG.name` text, `NavMain`, `NavUser`, variant/collapsible wiring untouched.

## Boundaries

- Do NOT edit `login-form.tsx` or `login-brand-panel.tsx`.
- Do NOT add a new brand component unless the file already has one (it does not).
- Do NOT change sidebar width tokens or `SidebarMenuButton` variants.
- Do NOT use `filter: invert` (that is only for the red brand panel).
- If `Command` is used elsewhere in this file after the swap, you made a mistake — it is only the brand icon today.

## Verification

- **Mechanical**: `pnpm typecheck` (optional). No `pnpm build`.
- **Feel check**:
  - Dashboard sidebar expanded: SACDIA mark (green/navy/yellow) + “SACDIA Admin”. No keyboard-command glyph.
  - Collapse to icon rail: 16px logo remains, no overflow, no `size-10` box.
  - Dark theme: logo still readable (full-color asset). If contrast fails badly, STOP and report — do not invent a second asset in this plan.
  - Click the brand row: navigates to `/dashboard`.
  - Screen reader on the link: one name (`SACDIA Admin`), not “SACDIA SACDIA Admin”.
- **Done when**: `Command` import is gone from `app-sidebar.tsx` and the header uses `/svg/LogoSACDIA.svg`.
