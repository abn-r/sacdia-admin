# 002 — Unify list stagger onto animation tokens

- **Status**: DONE
- **Commit**: 1d5c22b
- **Severity**: HIGH
- **Category**: Purpose & frequency + cohesion
- **Estimated scope**: 4 files, small

## Problem

Four list surfaces still hand-roll `animate-in` instead of `STAGGER_CLASSES` + `getStaggerStyle`. Two have **no cap** (long lists wait 1s+). Two use a 20ms step (below the 30–80ms floor) and `duration-300` without `motion-reduce`.

```tsx
/* src/app/(dashboard)/dashboard/configuration/achievements/_components/achievements-crud-page.tsx:409-412 — current */
<TableRow
  key={rowKey}
  className="animate-in fade-in slide-in-from-bottom-2 transition-colors hover:bg-muted/30"
  style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }}
>
```

```tsx
/* src/components/annual-rankings/annual-budget-config-list.tsx:106-112 — current */
<TableRow
  key={config.annual_ranking_config_id}
  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
  style={{
    animationDelay: `${index * 40}ms`,
    animationFillMode: "backwards",
  }}
>
```

```tsx
/* src/components/catalogs/catalog-crud-page.tsx:264-270 — current */
<TableRow
  key={rowKey}
  className={`${ROW_H} border-b border-border transition-colors hover:bg-muted/30 animate-in fade-in slide-in-from-bottom-2 duration-300`}
  style={{
    animationDelay: `${Math.min(idx * 20, 200)}ms`,
    animationFillMode: "backwards",
  }}
>
```

```tsx
/* src/components/catalogs/catalog-crud-page.tsx:396-402 — current mobile card */
<li
  key={rowKey}
  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
  style={{
    animationDelay: `${Math.min(idx * 20, 200)}ms`,
    animationFillMode: "backwards",
  }}
>
```

```tsx
/* src/components/rbac/roles-table.tsx:460-463 — current desktop only */
<TableRow
  key={role.role_id}
  className="transition-colors hover:bg-muted/30 animate-in fade-in slide-in-from-bottom-2 duration-300"
  style={{ animationDelay: `${Math.min(index * 20, 200)}ms`, animationFillMode: "backwards" }}
>
```

`roles-table.tsx` already imports the helper and uses it on mobile (`:609`). Desktop is the leftover.

## Target

Use the existing helper. Defaults: step `40`, cap `200`, duration `250`, ease `var(--ease-out-expo)`, `motion-reduce:animate-none`.

```ts
/* src/lib/animations.ts — already correct, do not edit */
export const STAGGER_CLASSES =
  "motion-reduce:animate-none animate-in fade-in slide-in-from-bottom-1 fill-mode-backwards duration-250 [animation-timing-function:var(--ease-out-expo)]";

export function getStaggerStyle(index: number, step = 40, cap = 200): React.CSSProperties {
  return {
    animationDelay: `${Math.min(index * step, cap)}ms`,
    animationFillMode: "backwards",
  };
}
```

```tsx
/* target — each row/card */
className={cn("…existing non-motion classes…", STAGGER_CLASSES)}
style={getStaggerStyle(index)}
```

Exact class strings after the change:

| File | className | style |
| --- | --- | --- |
| `achievements-crud-page.tsx` TableRow | `cn("transition-colors hover:bg-muted/30", STAGGER_CLASSES)` | `getStaggerStyle(idx)` |
| `annual-budget-config-list.tsx` TableRow | `STAGGER_CLASSES` | `getStaggerStyle(index)` |
| `catalog-crud-page.tsx` TableRow | `` `${ROW_H} border-b border-border transition-colors hover:bg-muted/30 ${STAGGER_CLASSES}` `` | `getStaggerStyle(idx)` |
| `catalog-crud-page.tsx` `<li>` | `STAGGER_CLASSES` | `getStaggerStyle(idx)` |
| `roles-table.tsx` desktop TableRow | `` `transition-colors hover:bg-muted/30 ${STAGGER_CLASSES}` `` | `getStaggerStyle(index)` |

Do not pass a custom `step` or `cap`. Defaults are the spec.

## Repo conventions to follow

- Import: `import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";`
- Exemplar (already correct): `src/components/enrollments/enrollments-table.tsx:32` and `:204`:

```tsx
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";
<TableRow key={enrollment.enrollment_id} className={STAGGER_CLASSES} style={getStaggerStyle(index)}>
```

- `roles-table.tsx:66` already has the import. Mobile `:609` is already `className={STAGGER_CLASSES} style={getStaggerStyle(index)}` — leave it.

## Steps

1. `achievements-crud-page.tsx` — add the import next to the other `@/lib/*` imports (after `PageHeader`). Replace the TableRow `className` / `style` as in the table above. File may not import `cn`; if `cn` is missing, use string concat: `` `transition-colors hover:bg-muted/30 ${STAGGER_CLASSES}` ``. Do not add a new utility file.
2. `annual-budget-config-list.tsx` — add the import. Replace TableRow classes/style.
3. `catalog-crud-page.tsx` — add the import. Replace **both** the desktop TableRow and the mobile `<li>`. Keep `ROW_H` / border / hover classes on the TableRow.
4. `roles-table.tsx` — replace **only** the desktop TableRow at `:460-463`. Do not touch the mobile `<li>` at `:609`.

## Boundaries

- Do NOT edit `src/lib/animations.ts`.
- Do NOT change reports/users loading staggers (`getStaggerStyle(i, 50)` is already capped and in range).
- Do NOT add stagger to pages that have none.
- Do NOT change table markup, columns, or filters.
- If a cited line no longer matches (drift since `1d5c22b`), STOP and report that file.

## Verification

- **Mechanical**: `pnpm typecheck` (optional). No `pnpm build`.
- **Feel check**:
  - Open Achievements, Annual budget configs, any Catalog CRUD, Roles (desktop + mobile).
  - First ~5 rows cascade with ~40ms gaps. After index 5 (`5 * 40 = 200`), remaining rows share the same delay. Last row never waits more than 200ms + 250ms duration.
  - Toggle `prefers-reduced-motion: reduce`. Rows appear with no slide/fade.
  - DevTools Animations at 10%: easing is `cubic-bezier(0.23, 1, 0.32, 1)`, not default ease. Duration 250ms, not 300ms.
- **Done when**: no raw `animate-in fade-in slide-in-from-bottom-2 duration-300` and no uncapped `index * N` remain in the four files.
