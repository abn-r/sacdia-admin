# 003 — Login enter under 300ms with motion tokens

- **Status**: DONE
- **Commit**: 1d5c22b
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: 1 file, tiny

## Problem

Login form wrapper uses a 700ms marketing entrance and the weak built-in `ease-out`. No `prefers-reduced-motion` handling. Tokens for this already exist.

```tsx
/* src/components/auth/login-form.tsx:51-56 — current */
return (
  <div
    className={cn(
      "w-full max-w-[380px]",
      "animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
    )}
  >
```

## Target

Reuse `PAGE_ENTER_CLASSES` (250ms, `--ease-out-expo`, `motion-reduce:animate-none`, `slide-in-from-bottom-2`).

```tsx
/* src/lib/animations.ts:19-20 — already correct, do not edit */
export const PAGE_ENTER_CLASSES =
  "motion-reduce:animate-none animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-250 [animation-timing-function:var(--ease-out-expo)]";
```

```tsx
/* target — src/components/auth/login-form.tsx */
import { PAGE_ENTER_CLASSES } from "@/lib/animations";

return (
  <div className={cn("w-full max-w-[380px]", PAGE_ENTER_CLASSES)}>
```

Exact values this applies:

- Duration: `250ms` (under the 300ms UI cap)
- Easing: `cubic-bezier(0.23, 1, 0.32, 1)` via `--ease-out-expo`
- Reduced motion: `animate-none` (no slide)

Do not keep `slide-in-from-bottom-4` or `duration-700` or `ease-out`.

## Repo conventions to follow

- Page-level entrance token: `PAGE_ENTER_CLASSES` from `@/lib/animations`.
- Exemplar: `src/app/(dashboard)/layout.tsx:12` and `:78`:

```tsx
import { PAGE_ENTER_CLASSES } from "@/lib/animations";
<div className={cn("min-h-0 min-w-0 flex-1 …", PAGE_ENTER_CLASSES)}>
```

- File already imports `cn` from `@/lib/utils`. Add the animations import next to it.

## Steps

1. `src/components/auth/login-form.tsx` — add `import { PAGE_ENTER_CLASSES } from "@/lib/animations";` (after the `cn` import is fine).
2. Replace the wrapper `className` with `cn("w-full max-w-[380px]", PAGE_ENTER_CLASSES)`.
3. Leave the rest of the form (labels, password toggle, submit, `font-display` on the h1) untouched. Those are out of this plan.

## Boundaries

- Do NOT edit `login-brand-panel.tsx`.
- Do NOT change login copy, validation, or the submit button hover arrow.
- Do NOT edit `DESIGN-SYSTEM.md` in this plan.
- Do NOT add new CSS keyframes.
- If the wrapper class string already uses `PAGE_ENTER_CLASSES` (drift since `1d5c22b`), STOP and report.

## Verification

- **Mechanical**: `pnpm typecheck` (optional). No `pnpm build`.
- **Feel check**:
  - Hard-refresh `/login`. Form is usable before 300ms. Movement starts immediately (`ease-out` punch, not a slow 700ms ease).
  - DevTools Animations at 10%: duration 250ms, curve `cubic-bezier(0.23, 1, 0.32, 1)`, travel is `slide-in-from-bottom-2` (8px), not `-bottom-4`.
  - Toggle `prefers-reduced-motion: reduce`. Form is visible on first paint with no slide.
- **Done when**: `duration-700` and raw `ease-out` are gone from `login-form.tsx`.
