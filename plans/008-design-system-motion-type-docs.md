# 008 — Align DESIGN-SYSTEM §7.1 and §9 with runtime

- **Status**: DONE
- **Commit**: f71b8b4
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file, docs only

## Problem

`DESIGN-SYSTEM.md` still describes Ember-era type and motion that the code no longer uses.

§7.1 (`DESIGN-SYSTEM.md:901-930`) says `PageHeader` h1 is `font-display` / Instrument Serif / `font-normal` / `text-3xl sm:text-4xl`. Runtime is Geist semibold:

```tsx
/* src/components/shared/page-header.tsx:56 — current, do not edit */
<h1 className="font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">{title}</h1>
```

§3.1 already forbids `font-display` in the admin. §7.1 contradicts it.

§9 (`DESIGN-SYSTEM.md:1252-1322`) still documents:

- `transition-all` on cards and buttons
- table stagger `duration-300` + `index * 50ms` with no cap
- Dialog `data-[state=open]` (this repo uses `data-open` / radix-nova)
- Login float orbs + `fade-up` 500ms (removed)

Tokens live in `src/lib/animations.ts` + `src/app/globals.css` (`--ease-out-expo`, `--duration-*`).

## Target

Rewrite **only** §7.1 and §9. Do not restyle `PageHeader`. Do not invent new tokens.

### §7.1 target facts

- Import stays `@/components/shared/page-header`
- h1: `font-semibold text-2xl text-foreground tracking-tight sm:text-3xl`
- Hierarchy via weight/size (Geist / `--font-sans`), not a second family
- Point to §3.1: no `font-display` / Instrument Serif on admin titles
- Keep the existing JSX usage sample (title, description, breadcrumbs, actions)
- Drop the “do not use font-bold because Instrument is 400” rule
- Description `max-w-prose`, actions wrap on mobile — still true

### §9 target facts (must appear)

1. Tokens: `--ease-out-expo: cubic-bezier(0.23, 1, 0.32, 1)`; `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`; `--duration-fast: 150ms`; `--duration-normal: 200ms`; `--duration-slow: 250ms`; `--duration-sheet: 300ms`. JS helpers in `src/lib/animations.ts`: `PAGE_ENTER_CLASSES`, `STAGGER_CLASSES`, `EMPTY_STATE_ENTER_CLASSES`, `SURFACE_MOTION_CLASSES`, `getStaggerStyle(index, step = 40, cap = 200)`.
2. Rules: UI motion ≤ 300ms; no `ease-in`; no `scale(0)`; no new `transition-all` (sidebar rail is a settled exception); keyboard surfaces (command palette / `⌘J`) have no overlay or content animation; hover **transforms** gated with `[@media(hover:hover)_and_(pointer:fine)]:`; `motion-reduce:` drops movement, color/opacity may remain; press feedback `scale(0.97)` at 150ms.
3. Lists: `STAGGER_CLASSES` + `style={getStaggerStyle(i)}` — not raw `duration-300` / `index * 50`.
4. Overlays: Dialog/AlertDialog fade + `zoom-in-95` via `SURFACE_MOTION_CLASSES` (200ms). Command palette: `overlayInstant` + content `animate-none`. Tooltips: provider `delayDuration={300}` `skipDelayDuration={300}`; animate only `data-[state=delayed-open]`; `data-[state=instant-open]:animate-none`.
5. Accordion/collapsible: height keyframes + `motion-reduce:animate-none`.
6. Login enter: `PAGE_ENTER_CLASSES` (250ms). No float orbs, no `animate-fade-up`.
7. Loading: `Loader2` + `animate-spin`, `LoadingSkeleton` — keep this subsection.

Add a one-line changelog note at the top audit block: `2026-08-23` aligned §7.1 with `page-header.tsx` and §9 with `src/lib/animations.ts`.

## Repo conventions to follow

- Spanish neutro, same heading levels (`### 7.1`, `### 9.1`…).
- Do not convert the whole DESIGN-SYSTEM to English.
- Code samples must match current class/prop names (`data-open`, `overlayInstant`, `getStaggerStyle`).

## Steps

1. Replace §7.1 body (from `### 7.1 PageHeader` through the line before `### 7.2 EmptyState`) with the target facts.
2. Replace §9 (from `## 9. Animaciones y Transiciones` through the line before `## 10. Layout y Navegacion`) with the target facts.
3. Add the 2026-08-23 changelog line in the existing header changelog list.

## Boundaries

- Do NOT edit `src/components/shared/page-header.tsx`.
- Do NOT rewrite §3, §5, or other DESIGN-SYSTEM sections even if they still mention Ember.
- Do NOT document sidebar rail as a thing to “fix”.
- Do NOT add new runtime CSS.
- If §7.1 already shows `font-semibold text-2xl` and §9 already cites `STAGGER_CLASSES`, STOP and report.

## Verification

- **Mechanical**: `rg -n 'Instrument Serif|font-display|animate-float|index \\* 50|transition-all hover:border' DESIGN-SYSTEM.md` — those strings must not remain inside §7.1 or §9. (`Instrument` may still appear in §3.1 as the “do not use” note.)
- **Feel check**: none (docs only).
- **Done when**: an executor reading only §7.1/§9 would copy current tokens, not Ember leftovers.
