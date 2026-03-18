# SACDIA Admin — Design System

## Direction & Feel

**Domain**: Adventist Pathfinder/Adventurer club management system
**World**: Nature trails, forest green, community, badges, achievements, service
**Feel**: Organized but warm, professional but approachable
**Signature**: Teal-green primary that connects to nature/scouting identity

**Rejections**:
- Generic grayscale → teal-green brand palette
- Identical placeholder pages → each page has unique visual expression
- Flat nav list → grouped sections with labels
- Shadow-based depth → borders-only strategy

---

## Depth Strategy

**Borders-only** — Clean, technical admin tool. No shadows on cards or surfaces. Separation achieved through:
- `border` token for structural boundaries
- `bg-muted/30` for subtle surface differentiation (table headers, inset areas)
- `bg-primary/8` or `bg-primary/10` for branded highlights

---

## Spacing

**Base unit**: 4px
- Micro: 4px (gap-1)
- Component: 8-12px (gap-2, gap-3, p-2, p-3)
- Section: 16-20px (p-4, p-5, gap-4, gap-5)
- Major: 24-32px (space-y-6, space-y-8)

**Card padding**: p-4 (compact) or p-5 (standard)
**Form field gap**: space-y-1.5 between label and input

---

## Border Radius

- Inputs/Buttons: `rounded-md` (8px) — professional
- Cards: `rounded-lg` (var(--radius)) — 8px
- Badges: `rounded-md` — consistent with system
- Avatars/Icons: `rounded-full` (circles) or `rounded-lg` (squares)

---

## Typography

- **Page title**: `text-xl font-semibold tracking-tight`
- **Card title**: `text-base font-semibold leading-none tracking-tight`
- **Section label**: `text-sm font-semibold text-muted-foreground`
- **Body**: `text-sm` (14px default)
- **Small/Label**: `text-[13px]` for UI text, `text-xs` (12px) for metadata
- **Micro**: `text-[11px]` for sidebar labels, version info
- **Data**: `font-mono tabular-nums` for numbers, dates, IDs
- **Stat numbers**: `text-2xl font-semibold tracking-tight`

---

## Color & Surfaces

### Primitives (Light)
- **Primary**: `oklch(0.44 0.11 165)` — deep teal-green
- **Background**: `oklch(0.985 0.002 165)` — near-white with teal hint
- **Card**: `oklch(1 0 0)` — pure white
- **Muted**: `oklch(0.96 0.006 165)` — subtle teal tint
- **Border**: `oklch(0.915 0.006 165)` — soft teal-tinted

### Semantic
- **Success**: `oklch(0.52 0.14 155)` — green
- **Warning**: `oklch(0.75 0.15 80)` — amber
- **Destructive**: `oklch(0.577 0.245 27.325)` — red

### Usage
- `bg-primary/8` or `bg-primary/10` — icon badges, active states
- `bg-muted/30` — table headers, inset backgrounds
- `border-primary/30` — hover accent on cards
- `text-primary` — active nav items, key icons

---

## Key Component Patterns

### Stat Card
- Icon in `bg-primary/8` badge (top-right)
- Label in `text-[13px] font-medium text-muted-foreground`
- Value in `text-2xl font-semibold tracking-tight`
- Optional trend indicator below

### Page Header
- Optional icon in `bg-primary/10 rounded-lg` (h-9 w-9)
- Title + description stacked
- Actions slot on the right

### Nav Item (Sidebar)
- Grouped with uppercase `text-[11px]` labels
- Active: `bg-primary/10 text-primary`
- Inactive: `text-muted-foreground`
- Icon: `h-4 w-4 shrink-0`

### Empty State
- Icon in `bg-muted rounded-full` (h-11 w-11)
- Title: `text-sm font-semibold`
- Description: `text-[13px] text-muted-foreground max-w-sm`
- Dashed border container

### Table Row Actions
- Ghost buttons with icons (Pencil, Ban)
- Destructive variant: `text-destructive hover:text-destructive`
- Labels hidden on mobile: `hidden sm:inline`

### Form
- Wrapped in Card
- 2-column grid on sm+
- Textarea/checkbox span full width
- Error: `bg-destructive/10` with AlertCircle icon
- Submit separated by `border-t pt-5`

---

## Animation

- Duration: `duration-150` (micro-interactions), `duration-200` (panels/overlays)
- Easing: `ease-out`
- Hover cards: `transition-all duration-150`
- Dialog: `scale-95 → scale-100` + `opacity-0 → opacity-100`
- Mobile sidebar: `translate-x` slide

---

## States

- **Hover**: `hover:bg-accent/30` or `hover:bg-muted/30`
- **Active**: `active:bg-primary/80`
- **Focus**: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`
- **Disabled**: `disabled:pointer-events-none disabled:opacity-50`
- **Loading**: Loader2 spinner icon + "Guardando..." text
- **Empty**: EmptyState component with contextual icon
- **Error**: Inline alert with `bg-destructive/10` background
