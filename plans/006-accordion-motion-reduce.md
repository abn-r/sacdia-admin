# 006 — Accordion honors prefers-reduced-motion

- **Status**: DONE
- **Commit**: f71b8b4
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file, tiny

## Problem

`CollapsibleContent` already drops height keyframes under reduced motion. `AccordionContent` still plays `animate-accordion-down` / `animate-accordion-up` with no `motion-reduce` gate.

```tsx
/* src/components/ui/accordion.tsx:67-71 — current */
<AccordionPrimitive.Content
  data-slot="accordion-content"
  className="overflow-hidden px-4 text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
  {...props}
>
```

Height animation is movement. Reduced motion must drop it. Opacity/color may stay; here the keyframes are height, so the whole animation goes away.

## Target

Mirror `CollapsibleContent`:

```tsx
/* src/components/ui/collapsible.tsx:32-34 — exemplar, do not edit */
"overflow-hidden motion-reduce:animate-none data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
```

```tsx
/* target — src/components/ui/accordion.tsx */
className="overflow-hidden px-4 text-sm motion-reduce:animate-none data-open:animate-accordion-down data-closed:animate-accordion-up"
```

Do **not** change accordion markup, icons, or trigger classes. Do **not** add CSS keyframes. Do **not** touch sidebar rail or `globals.css` collapsible keyframes (settled).

## Repo conventions to follow

- Tailwind `motion-reduce:animate-none` on the animated node (same as collapsible, dialog, stagger tokens).
- Keep Radix `data-open` / `data-closed` selectors (this primitive is radix-nova, not `data-[state=…]`).

## Steps

1. `src/components/ui/accordion.tsx` — on `AccordionContent` only, insert `motion-reduce:animate-none` after `text-sm` and before `data-open:animate-accordion-down`.

## Boundaries

- Do NOT edit `collapsible.tsx`, `sidebar.tsx`, or `globals.css`.
- Do NOT rewrite accordion trigger hover/underline.
- Do NOT add a new animation token.
- If `motion-reduce:animate-none` is already on `AccordionContent`, STOP and report.

## Verification

- **Mechanical**: class string contains `motion-reduce:animate-none` next to accordion open/close animations.
- **Feel check**: with `prefers-reduced-motion: reduce` (Rendering panel), accordion content appears/disappears with no height tween. Default motion still uses accordion-down/up.
- **Done when**: reduced-motion users get no accordion height animation; default users unchanged.
