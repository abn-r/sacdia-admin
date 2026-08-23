# 004 — Tooltip delay on first hover, skip on the next

- **Status**: DONE
- **Commit**: 1d5c22b
- **Severity**: MEDIUM
- **Category**: Purpose
- **Estimated scope**: 2 files, tiny

## Problem

Global tooltips open with **zero** delay. Icon-dense chrome (sidebar collapsed, table locks) fires accidental tooltips. Subsequent hovers also play the 150ms zoom, so a toolbar of icons feels slow.

```tsx
/* src/components/ui/tooltip.tsx:9-18 — current */
function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}
```

```tsx
/* src/app/layout.tsx:46 — current; inherits the 0 default */
<TooltipProvider>
```

```tsx
/* src/components/ui/tooltip.tsx:45-49 — current content; data-open animates every open */
className={cn(
  "z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) … data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  SURFACE_MOTION_CLASSES,
  "duration-150",
  className
)}
```

`data-open:animate-in` also applies to `instant-open`, so skip-delay still animates.

## Target

```tsx
/* target — TooltipProvider defaults */
function TooltipProvider({
  delayDuration = 300,
  skipDelayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  )
}
```

```tsx
/* target — TooltipContent motion classes */
"z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-2xl bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-4xl data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:animate-none data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
```

Keep `SURFACE_MOTION_CLASSES` and `"duration-150"` after that string.

Exact motion values:

- First open delay: `300ms`
- Skip-delay window after leaving a trigger: `300ms` (`skipDelayDuration`)
- First-open animation: 150ms, `cubic-bezier(0.23, 1, 0.32, 1)`, `zoom-in-95` (not `scale(0)`), origin `var(--radix-tooltip-content-transform-origin)`
- Instant-open: **no** enter animation (`animate-none`)
- Exit: keep 150ms fade/zoom-out-95 (asymmetric: enter can skip, exit may still fade)

`src/app/layout.tsx` stays `<TooltipProvider>` with no props — it must pick up the new defaults. Do not pass `delayDuration={0}`.

Nested providers in jobs UI (`jobs-overview-client.tsx:214`, `cron-runs-section.tsx:173`, `cron-history-client.tsx:383`) also use bare `<TooltipProvider>` and will inherit the new defaults. Leave them bare.

## Repo conventions to follow

- Overlay motion: `SURFACE_MOTION_CLASSES` + a shorter `duration-150` override (already there).
- Origin-aware: `origin-(--radix-tooltip-content-transform-origin)` (already there). Keep it.
- DESIGN-SYSTEM §5 historically asked for `delayDuration={300}` — this plan restores that number in the primitive default, not in docs.

## Steps

1. `src/components/ui/tooltip.tsx` — change `TooltipProvider` defaults to `delayDuration = 300` and pass `skipDelayDuration = 300` (allow callers to override both via props).
2. Same file — in `TooltipContent`, **remove** `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95`. Keep the `data-[state=delayed-open]:…` trio. Add `data-[state=instant-open]:animate-none`. Keep `data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95`, `SURFACE_MOTION_CLASSES`, and `duration-150`.
3. Do not edit `src/app/layout.tsx` unless it already passes `delayDuration` (it does not at `1d5c22b`).

## Boundaries

- Do NOT change tooltip visuals (colors, arrow, padding).
- Do NOT add a JS tooltip store or `data-instant` attribute of your own — use Radix `delayed-open` / `instant-open`.
- Do NOT set delay to 0 on the jobs nested providers.
- Do NOT add dependencies.
- If `skipDelayDuration` is not a valid prop on this `radix-ui` Tooltip.Provider (type error), STOP and report the type error. Do not invent a custom skip timer.

## Verification

- **Mechanical**: `pnpm typecheck` (optional). No `pnpm build`.
- **Feel check**:
  - Hover a single sidebar/icon tooltip from cold. Wait ~300ms, then it appears with a short 150ms zoom from the trigger (not from center).
  - Immediately hover an adjacent tooltip (or another trigger within 300ms). It appears **now**, no delay, no zoom.
  - Wait >300ms with no tooltip, hover again. Delay returns.
  - DevTools Animations at 10% on the first tooltip: 150ms, `zoom-in-95`, origin at the trigger.
  - `prefers-reduced-motion: reduce`: `SURFACE_MOTION_CLASSES` already sets `motion-reduce:animate-none`. Confirm no zoom; delay may remain (that is OK — delay is not motion).
- **Done when**: cold hover waits ~300ms; chained hovers are instant and unanimated.
