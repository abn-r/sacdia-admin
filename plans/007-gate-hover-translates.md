# 007 — Gate hover translates behind pointer:fine

- **Status**: DONE
- **Commit**: f71b8b4
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 2 files, tiny

## Problem

Touch devices latch `:hover` after tap. Ungated `translate` on those hovers leaves the chevron/arrow shifted after the finger lifts.

```tsx
/* src/components/auth/login-form.tsx:36 — current */
<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
```

```tsx
/* src/components/activities/activities-date-list.tsx:146 — current */
<ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
```

`finances-summary-cards.tsx` already gates transforms correctly. Login and activities do not.

## Target

Exact Tailwind v4 variant already in the repo:

`[@media(hover:hover)_and_(pointer:fine)]:…`

```tsx
/* src/components/finances/finances-summary-cards.tsx:100-101 — exemplar, do not edit */
"group transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
"[@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/20 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-md",
```

```tsx
/* target — login-form.tsx */
<ArrowRight className="size-4 transition-transform motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0.5" />
```

```tsx
/* target — activities-date-list.tsx */
<ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-hover:text-foreground [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0.5" />
```

Keep `group-hover:text-foreground` ungated — color is not movement.

Translate stays `0.5` (2px). Do not invent a new distance.

## Repo conventions to follow

- Arbitrary media variant, not a custom `@utility`.
- `motion-reduce:transition-none` next to transform transitions (finance cards, buttons).

## Steps

1. `src/components/auth/login-form.tsx` — replace the ArrowRight `className` with the target string above.
2. `src/components/activities/activities-date-list.tsx` — replace the ChevronRight `className` with the target string above.

## Boundaries

- Do NOT edit `finances-summary-cards.tsx`.
- Do NOT change login enter (`PAGE_ENTER_CLASSES`) or button press scale.
- Do NOT gate color/border hovers unless they are tied to a translate on the same node and already gated in the exemplar.
- Do NOT touch sidebar rail `transition-all` (settled exemption).
- If both sites already use the `pointer:fine` variant, STOP and report.

## Verification

- **Mechanical**: `rg 'group-hover:translate' src` returns only lines that also include `pointer:fine` (or no matches). Login + activities include the media variant.
- **Feel check**: mouse + fine pointer — arrow/chevron nudges 2px on hover. Touch / coarse pointer — no leftover translate after tap. `prefers-reduced-motion: reduce` — no transform transition.
- **Done when**: those two icons never translate on touch hover sticky-state.
