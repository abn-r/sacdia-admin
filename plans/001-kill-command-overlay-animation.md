# 001 — Kill command-palette overlay animation

- **Status**: DONE
- **Commit**: 1d5c22b
- **Severity**: HIGH
- **Category**: Purpose & frequency
- **Estimated scope**: 2 files, small

## Problem

Command palette opens with `⌘J` (keyboard, 100+ times/day). Content already has `animate-none`. Overlay still fades 200ms because `DialogContent` always mounts an animated `DialogOverlay`.

```tsx
/* src/components/ui/command.tsx:56-64 — current */
<DialogContent
  className={cn(
    "top-1/3 translate-y-0 overflow-hidden rounded-4xl! p-0",
    "motion-reduce:animate-none data-open:animate-none data-closed:animate-none",
    className
  )}
  showCloseButton={showCloseButton}
>
```

```tsx
/* src/components/ui/dialog.tsx:53-64 — current */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
```

```tsx
/* src/components/ui/dialog.tsx:36-49 — current overlay */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/80 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        SURFACE_MOTION_CLASSES,
        className
      )}
      {...props}
    />
  )
}
```

Do **not** try to override with `className="...animate-none"` on the overlay. Tailwind `animate-in` vs `animate-none` has equal specificity; source order can keep the fade.

## Target

Add an `instant` flag that **omits** animation classes (does not fight them).

```tsx
/* target — src/components/ui/dialog.tsx */
function DialogOverlay({
  className,
  instant = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay> & {
  instant?: boolean
}) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/80 supports-backdrop-filter:backdrop-blur-xs",
        !instant &&
          "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        !instant && SURFACE_MOTION_CLASSES,
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  overlayInstant = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  overlayInstant?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay instant={overlayInstant} />
      {/* existing DialogPrimitive.Content unchanged */}
```

```tsx
/* target — src/components/ui/command.tsx CommandDialog */
<DialogContent
  className={cn(
    "top-1/3 translate-y-0 overflow-hidden rounded-4xl! p-0",
    "motion-reduce:animate-none data-open:animate-none data-closed:animate-none",
    className
  )}
  showCloseButton={showCloseButton}
  overlayInstant
>
```

Regular dialogs keep the 200ms fade (`overlayInstant` defaults `false`).

## Repo conventions to follow

- Motion tokens live in `src/lib/animations.ts`. `SURFACE_MOTION_CLASSES` stays on **normal** overlays.
- Command content already uses `data-open:animate-none` — overlay must match that policy.
- Exemplar of “no animation on keyboard surface”: `src/components/ui/command.tsx:59` (`data-open:animate-none`).

## Steps

1. `src/components/ui/dialog.tsx` — destructure `instant` on `DialogOverlay` (default `false`). When `instant` is true, render only the static overlay classes (`fixed inset-0 isolate z-50 bg-black/80 supports-backdrop-filter:backdrop-blur-xs`). When false, keep today’s `data-open:animate-in` / `fade-in-0` / `data-closed:animate-out` / `fade-out-0` plus `SURFACE_MOTION_CLASSES`.
2. Same file — add `overlayInstant?: boolean` (default `false`) to `DialogContent`. Pass `<DialogOverlay instant={overlayInstant} />`. Do not spread `overlayInstant` onto the DOM node.
3. `src/components/ui/command.tsx` — pass `overlayInstant` on the `DialogContent` inside `CommandDialog`. Leave the existing content `animate-none` classes in place.

## Boundaries

- Do NOT change `AlertDialogOverlay`, `SheetOverlay`, or `DrawerOverlay`.
- Do NOT remove fade from normal dialogs.
- Do NOT add Framer Motion or new dependencies.
- Do NOT change SearchDialog keyboard handler or Command list markup.
- If `DialogContent` already has an `overlayClassName` / `instant` prop (drift since `1d5c22b`), STOP and report.

## Verification

- **Mechanical**: `pnpm typecheck` (optional). No `pnpm build`.
- **Feel check**:
  - Press `⌘J` / `Ctrl+J`. Overlay and panel appear in the same frame. No 200ms dim fade.
  - Open a normal dialog (e.g. a form modal). Overlay still fades ~200ms with `cubic-bezier(0.23, 1, 0.32, 1)`.
  - Spam `⌘J` open/close. No restart-from-zero flicker on the overlay.
  - DevTools → Rendering → `prefers-reduced-motion: reduce`. Command still instant. Normal dialog overlay has no fade (`SURFACE_MOTION_CLASSES` already includes `motion-reduce:animate-none`).
- **Done when**: Command palette open/close is visually instant; other dialogs unchanged.
