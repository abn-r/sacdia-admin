# SACDIA Admin - Design System & Style Guide

> Documento de referencia para todas las interfaces del panel administrativo.
> Cada nueva pantalla, componente o modal debe seguir estas definiciones.

> **Actualizado 2026-04-15 — Ember Redesign (fases 1-4)**. Este documento refleja el estado actual del sistema despues del rediseno "Ember". Cambios principales desde la version original:
>
> - **Paleta**: migrada de azul-violeta a naranja cobre. Primary `oklch(0.66 0.21 42)` (~#F05A28). Sidebar claro con pill naranja en item activo (estilo Finexy). Ver seccion 2.
> - **Tipografia**: `Instrument Serif` como `--font-display` para h1 de PageHeader. Geist Sans para el resto. Ver seccion 3.
> - **Radius**: base `0.75rem` (12px), escala completa `xs` -> `3xl`. Ver seccion 4.1.
> - **Sombras**: escala custom con `--shadow-xs` (casi imperceptible) para cards. Ver globals.css.
> - **Semanticos nuevos**: tokens `--success`, `--warning`, `--info` + foregrounds pareados. Badge variants `soft`, `soft-info`, `soft-success`, `soft-warning` para status tinted.
> - **Componentes nuevos**: `<StatusBadge>` unificado con 9 intents (incluye `progress-1/2/3` para pipelines ordenados). `<PageHeader>` extendido con `font-display` + breadcrumbs.
> - **Dark mode**: noise texture sutil via `body::before` para dar profundidad sin glassmorphism.
>
> Commits de referencia en `development`: `3734d87` (Fase 1 tokens+fonts) -> `4d9fb20` (Fase 2 base components) -> `cb78d20` (Fase 3 StatusBadge+PageHeader+Ola A) -> `bf7f4d0` (polish RBAC+enum) -> `ce59e93` (Fase 4 shell layout) -> `76452a3` (apiRequest auto-detect) -> `84f799c` (Ola B color cleanup) -> `fab11df` (tabs line variant).

---

## 1. Stack de UI

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.x |
| Componentes | shadcn/ui (estilo `new-york`) | latest |
| Primitivos | Radix UI (`radix-ui`) | 1.4.x |
| Estilos | Tailwind CSS v4 + `tw-animate-css` | 4.x |
| Iconos | `lucide-react` | 0.563+ |
| Graficos | Recharts | 3.x |
| Formularios | React Hook Form + Zod | 7.x / 4.x |
| Toasts | Sonner | 2.x |
| Temas | next-themes | 0.4.x |
| Utilidad CSS | `cn()` de `clsx` + `tailwind-merge` | - |

**Regla absoluta (retroactiva)**: Toda interfaz, nueva o existente, usa componentes de `@/components/ui/*` (shadcn/Radix) para elementos interactivos visibles. Si se necesita un componente que no existe, instalar via `npx shadcn@latest add <componente>`.

**Excepciones tipicas permitidas**:
- `<input type="hidden">` para formularios/server actions.
- Elementos nativos requeridos por APIs del navegador o integraciones third-party sin wrapper equivalente.
- Casos puntuales documentados en PR con justificacion tecnica (accesibilidad o compatibilidad).

---

## 2. Paleta de Color (OKLCH — Ember)

El sistema usa CSS custom properties en OKLCH para precision de color perceptual. Todas las clases de Tailwind referencian estos tokens. Los valores de abajo reflejan el estado actual de `src/app/globals.css` post-Ember.

### 2.1 Tokens de Superficie

| Token | Light Mode | Dark Mode | Uso |
|-------|-----------|-----------|-----|
| `--background` | `oklch(0.975 0.004 75)` | `oklch(0.155 0.012 60)` | Fondo general (stone calido) |
| `--foreground` | `oklch(0.18 0.015 60)` | `oklch(0.96 0.005 75)` | Texto principal |
| `--card` | `oklch(1 0 0)` | `oklch(0.19 0.014 60)` | Fondo de tarjetas |
| `--card-foreground` | `oklch(0.18 0.015 60)` | `oklch(0.96 0.005 75)` | Texto en tarjetas |
| `--popover` | `oklch(1 0 0)` | `oklch(0.21 0.015 60)` | Fondo de popovers/menus |
| `--muted` | `oklch(0.96 0.008 75)` | `oklch(0.23 0.015 60)` | Superficies secundarias |
| `--muted-foreground` | `oklch(0.52 0.012 60)` | `oklch(0.68 0.012 60)` | Texto secundario/auxiliar |
| `--accent` | `oklch(0.94 0.015 70)` | `oklch(0.26 0.018 60)` | Hover backgrounds |
| `--secondary` | `oklch(0.96 0.008 75)` | `oklch(0.23 0.015 60)` | Botones secundarios |

### 2.2 Colores Semanticos

| Token | Light | Dark | Clase Tailwind | Uso |
|-------|-------|------|----------------|-----|
| `--primary` | `oklch(0.66 0.21 42)` | `oklch(0.72 0.19 42)` | `text-primary`, `bg-primary` | Acciones principales, enlaces, brand (naranja cobre Ember ~#F05A28) |
| `--destructive` | `oklch(0.58 0.22 27)` | `oklch(0.67 0.22 27)` | `text-destructive`, `bg-destructive` | Errores, eliminaciones, alertas |
| `--success` | `oklch(0.56 0.15 152)` | `oklch(0.66 0.16 152)` | `text-success`, `bg-success` | Estados activos, confirmaciones |
| `--warning` | `oklch(0.74 0.16 75)` | `oklch(0.78 0.16 75)` | `text-warning`, `bg-warning` | Advertencias, estados pendientes |
| `--info` | `oklch(0.58 0.14 235)` | `oklch(0.68 0.14 235)` | `text-info`, `bg-info` | Info general, estados "enviado" |

Cada semantico tiene un `*-foreground` pareado para texto sobre fondo pleno:
- `--destructive-foreground`, `--success-foreground`, `--warning-foreground`, `--info-foreground`

**Patron soft tint**: para fondos translucidos con texto legible, usar `bg-{token}/10` o `/15` + `text-{token}`. En dark mode, algunos tokens (ej. warning) requieren override explicito `dark:text-{token}` porque el `*-foreground` en light es oscuro y colapsa contra bg translucido.

### 2.3 Colores de Borde e Input

| Token | Light | Dark |
|-------|-------|------|
| `--border` | `oklch(0.91 0.008 75)` | `oklch(1 0 0 / 0.08)` (translucido) |
| `--input` | `oklch(0.91 0.008 75)` | `oklch(1 0 0 / 0.10)` |
| `--ring` | `oklch(0.66 0.21 42 / 0.4)` | `oklch(0.72 0.19 42 / 0.5)` |

### 2.4 Colores de Grafico (Paleta Ember)

Los 5 chart tokens son la paleta ordenada que usa `StatusBadge progress-1/2/3`, `role-distribution-chart.tsx` y otros graficos/listados:

| Token | Light | Dark | Uso semantico |
|-------|-------|------|---------------|
| `--chart-1` | `oklch(0.66 0.21 42)` | `oklch(0.72 0.19 42)` | = primary (naranja cobre) — director, pipeline stage 1 |
| `--chart-2` | `oklch(0.58 0.14 235)` | `oklch(0.68 0.14 235)` | azul — coordinacion, pipeline stage 2 |
| `--chart-3` | `oklch(0.56 0.15 152)` | `oklch(0.66 0.16 152)` | verde — campo, pipeline stage 3 |
| `--chart-4` | `oklch(0.74 0.16 75)` | `oklch(0.78 0.16 75)` | ambar warning-like |
| `--chart-5` | `oklch(0.48 0.09 300)` | `oklch(0.6 0.1 300)` | purpura apagado |

### 2.5 Colores de Sidebar (Light pill pattern)

El sidebar usa el pattern Finexy: fondo claro con pill naranja relleno en el item activo.

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--sidebar` | `oklch(0.985 0.004 75)` | `oklch(0.175 0.013 60)` | Fondo del sidebar (ligeramente mas claro que bg en light; mas oscuro en dark) |
| `--sidebar-foreground` | `oklch(0.42 0.015 60)` | `oklch(0.72 0.012 60)` | Texto normal del sidebar |
| `--sidebar-primary` | `oklch(0.66 0.21 42)` | `oklch(0.72 0.19 42)` | Pill naranja del item activo |
| `--sidebar-primary-foreground` | `oklch(0.99 0.005 75)` | `oklch(0.15 0.015 60)` | Texto sobre pill activo |
| `--sidebar-accent` | `oklch(0.94 0.01 75)` | `oklch(0.24 0.016 60)` | Hover bg (items inactivos) |
| `--sidebar-border` | `transparent` | `oklch(1 0 0 / 0.06)` | Sin border visible en light |

### 2.6 Reglas de Uso de Color

```
HACER:
  bg-primary/10          -> Fondo tenue para iconos o badges
  bg-destructive/10      -> Fondo tenue para estados de error
  bg-success/10          -> Fondo tenue para estados activos
  bg-warning/10          -> Fondo tenue para estados pendientes
  text-muted-foreground  -> Texto auxiliar, labels secundarios
  bg-muted               -> Fondos neutros (skeletons, placeholders)

EVITAR POR DEFECTO:
  bg-blue-50, bg-red-100, bg-amber-50  -> Colores hardcoded de Tailwind
  text-blue-600, text-red-500           -> Usar tokens semanticos
  Cualquier color que no funcione en dark mode

EXCEPCION:
  Se permiten colores hardcoded cuando haya solicitud explicita de mejora visual
  y se valide compatibilidad en dark mode.
```

---

## 3. Tipografia

### 3.1 Fuentes

Cargadas via `next/font/google` en `src/app/layout.tsx` y expuestas como CSS variables en `globals.css @theme`:

| Variable | Fuente | Uso |
|----------|--------|-----|
| `--font-geist-sans` | `Geist` (Vercel) | Todo el texto de UI — geometrica, distintiva, con stylistic alternates activadas (`cv02`, `cv03`, `cv04`, `cv11`, `ss01`) |
| `--font-geist-mono` | `Geist Mono` (Vercel) | Codigo, valores tabulares |
| `--font-display` | `Instrument Serif` (Google Fonts) | **SOLO h1 de `<PageHeader>`** — serif elegante para titulos de pagina |

**Regla critica**: Instrument Serif SOLO en h1 via `<PageHeader>`. NO usarla en body, numeros KPI, o cualquier otro contexto. Los numeros KPI van en Geist bold con `tabular-nums` (ver seccion 3.2). El serif en body es ilegible a `text-sm`.

### 3.2 Escala Tipografica

| Elemento | Clase | Tamano | Peso | Tracking |
|----------|-------|--------|------|----------|
| Titulo de pagina (h1) | `text-2xl font-bold` | 1.5rem | 700 | - |
| Titulo de pagina (h1 alternativo) | `text-xl font-semibold tracking-tight` | 1.25rem | 600 | tight |
| Subtitulo / Card Title | `text-base font-semibold` | 1rem | 600 | - |
| Nombre de seccion (sidebar) | `text-[10px] font-semibold uppercase tracking-widest` | 10px | 600 | widest |
| Texto normal | `text-sm` | 0.875rem | 400 | - |
| Texto auxiliar | `text-sm text-muted-foreground` | 0.875rem | 400 | - |
| Descripcion corta | `text-[13px] text-muted-foreground` | 13px | 400 | - |
| Label de formulario | `text-sm font-medium` | 0.875rem | 500 | - |
| Label tipo tag | `text-xs font-medium uppercase tracking-wider` | 0.75rem | 500 | wider |
| Valores numericos | `tabular-nums` | - | - | - |
| Table header | `text-xs font-medium uppercase tracking-wider text-muted-foreground` | 0.75rem | 500 | wider |
| Badge | `text-xs font-medium` | 0.75rem | 500 | - |
| Micro texto | `text-[11px]` | 11px | - | - |
| Footer de pagina | `text-sm text-muted-foreground` | 0.875rem | 400 | - |
| Codigo inline | `rounded bg-muted px-1.5 py-0.5 text-xs font-mono` | 0.75rem | 400 | - |

### 3.3 Reglas Tipograficas

- Nunca usar `font-size` arbitrario fuera de la escala definida
- Titulos principales: `font-bold` (700) o `font-semibold` (600)
- Nunca usar `font-light` o `font-thin`
- Valores numericos: siempre `tabular-nums` para alineacion consistente
- Texto truncado: `truncate` con `max-w-*` definido

---

## 4. Espaciado y Layout

### 4.1 Radios de Borde

Base 12px (mas generoso que shadcn default) con escala de 6 pasos:

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius` | `0.75rem` (12px) | Base |
| `--radius-xs` | `calc(var(--radius) - 8px)` = 4px | Elementos micro |
| `--radius-sm` | `calc(var(--radius) - 6px)` = 6px | Checkboxes, badges pequenos |
| `--radius-md` | `calc(var(--radius) - 4px)` = 8px | Inputs, buttons |
| `--radius-lg` | `calc(var(--radius) - 2px)` = 10px | Menu items, dropdowns |
| `--radius-xl` | `var(--radius)` = 12px | Cards, dialogs |
| `--radius-2xl` | `calc(var(--radius) + 4px)` = 16px | Cards grandes, containers destacados |
| `--radius-3xl` | `calc(var(--radius) + 8px)` = 20px | Elementos especiales, hero |

**Clases principales:**
- `rounded-md` -> Inputs, buttons, selects (8px)
- `rounded-lg` -> Dropdown content, menu items (10px)
- `rounded-xl` -> Cards, modals, containers principales (12px)
- `rounded-2xl` -> Cards destacadas, contenedores con presencia (16px)
- `rounded-full` -> Avatars, dots, badges circulares, search bars

### 4.2 Grid del Dashboard

```
Layout principal:
  Sidebar (w-60 = 240px, sticky top-0, h-screen) | Contenido (flex-1, max-w-[1536px] mx-auto)

Contenido:
  Header (h-14, sticky top-0, border-b)
  Main (padding: p-4 md:p-6)

Spacing vertical entre secciones:
  space-y-6   -> Espaciado principal entre secciones de pagina
  space-y-5   -> Dentro de cards o secciones menores
  space-y-4   -> Formularios, listas de items
  space-y-3   -> Elementos compactos

Spacing de padding en Cards:
  p-5         -> CardContent estandar
  p-4         -> CardFooter, secciones compactas
  p-7         -> Formularios de login (especial)
```

### 4.3 Grids de Tarjetas

| Contexto | Clase |
|----------|-------|
| KPIs / Estadisticas (4 cols) | `grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4` |
| Tarjetas de contenido (3 cols) | `grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3` |
| Metricas simples (3 cols) | `grid grid-cols-1 gap-3 sm:grid-cols-3` |
| Grafico + Sidebar | `grid grid-cols-1 gap-6 lg:grid-cols-3` con `col-span-2` en grafico |

### 4.4 Breakpoints

| Breakpoint | Pixel | Uso |
|------------|-------|-----|
| `sm` | 640px | Grids 2-col, elementos responsive |
| `md` | 768px | Sidebar visible, tabla desktop, padding mayor |
| `lg` | 1024px | Grids de graficos |
| `xl` | 1280px | Grids de 3-4 columnas |

---

## 5. Componentes UI (shadcn/Radix)

### 5.1 Button

**Import:** `@/components/ui/button`

| Variante | Uso | Clase |
|----------|-----|-------|
| `default` | Acciones primarias (Crear, Guardar) | `bg-primary text-primary-foreground hover:bg-primary/90` |
| `destructive` | Eliminar, desactivar | `bg-destructive text-white hover:bg-destructive/90` |
| `outline` | Acciones secundarias, filtros, cancelar | `border bg-background shadow-xs hover:bg-accent` |
| `secondary` | Alternativa neutra | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `ghost` | Iconos, acciones sutiles en tablas | `hover:bg-accent hover:text-accent-foreground` |
| `soft` | CTA secundario con color sin llenar | `bg-primary/10 text-primary hover:bg-primary/15` |
| `link` | Links en texto, "Ver todos" | `text-primary underline-offset-4 hover:underline` |

**Nuevo en Ember (Fase 2)**: la variante `soft` cubre el gap entre `default` (lleno, grita) y `ghost`/`secondary` (gris plano). Ideal para "Ver mas", "Exportar", CTAs de card header donde queres color sin competir con la accion primaria de la pagina.

| Tamano | Uso | Valor |
|--------|-----|-------|
| `default` | Botones de accion principal | `h-9 px-4` |
| `xs` | Botones micro en badges | `h-6 px-2 text-xs` |
| `sm` | Botones en tablas, footers | `h-8 px-3` |
| `lg` | Botones de login, CTAs grandes | `h-10 px-6` |
| `icon` | Solo icono (header, acciones) | `size-9` |
| `icon-xs` | Icono micro | `size-6` |
| `icon-sm` | Icono en dropdown triggers | `size-8` |
| `icon-lg` | Icono grande (hero, acciones destacadas) | `size-10` |

**Patron de boton con icono:**
```tsx
<Button>
  <Plus size={16} />
  Crear nuevo
</Button>
```

### 5.2 Badge

**Import:** `@/components/ui/badge`

Badge ahora tiene 11 variantes — las 6 clasicas (pleno + outline) mas las 4 `soft-*` tinted + `soft` primary que agregamos en Fase 2/3 como base del `<StatusBadge>` unificado.

**Variantes plenas (filled)**:

| Variante | Uso | Estilo |
|----------|-----|--------|
| `default` | Tags genericos, conteos | `bg-primary text-primary-foreground` |
| `secondary` | Labels neutros | `bg-secondary text-secondary-foreground` |
| `destructive` | Estado error/inactivo | `bg-destructive text-white` |
| `success` | Estado activo pleno | `bg-success text-success-foreground` |
| `warning` | Estado pendiente pleno | `bg-warning text-warning-foreground` |
| `outline` | Etiquetas sutiles | `border-border text-foreground` |
| `ghost` | Hover only | `[a&]:hover:bg-accent` |

**Variantes soft (tinted — preferidas para status)**:

| Variante | Uso | Estilo |
|----------|-----|--------|
| `soft` | Tag primary tinted | `bg-primary/10 text-primary border-primary/20` |
| `soft-info` | Status "enviado/en proceso" | `bg-info/10 text-info border-info/20` |
| `soft-success` | Status "validado/aprobado" | `bg-success/10 text-success border-success/20` |
| `soft-warning` | Status "pendiente/atencion" | `bg-warning/15 text-warning-foreground border-warning/30 dark:text-warning` |

**Regla de uso**: para status de dominio (submitted, approved, rejected, pending, etc.) **NO** uses `<Badge variant="...">` directo — usa `<StatusBadge intent="...">` de la seccion 7.4 que delega a Badge con el variant correcto. Badge directo solo para tags genericos o labels estaticos.

**Patron de uso**:
```tsx
// Status de dominio — preferir StatusBadge
<StatusBadge intent="success" label="Aprobado" />

// Tag estatico generico
<Badge variant="outline">Solo lectura</Badge>
<Badge variant="soft">Nuevo</Badge>
```

### 5.3 Card

**Import:** `@/components/ui/card`

Estructura base: `Card > CardHeader > CardTitle + CardDescription > CardContent > CardFooter`

```tsx
// Card estandar
<Card>
  <CardHeader>
    <CardTitle>Titulo</CardTitle>
    <CardDescription>Descripcion</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Contenido */}
  </CardContent>
</Card>

// Card de estadistica (sin CardHeader)
<Card className="group transition-all hover:border-primary/20">
  <CardContent className="p-5">
    {/* KPI con icono */}
  </CardContent>
</Card>

// Card con acciones en footer
<Card>
  <CardContent className="p-5">{/* ... */}</CardContent>
  <Separator />
  <CardFooter className="gap-3 p-4">
    <Button variant="outline" size="sm" className="flex-1">Editar</Button>
    <Button variant="secondary" size="sm" className="flex-1">Permisos</Button>
  </CardFooter>
</Card>
```

**Clases base de Card** (Ember — sombra casi imperceptible + border sutil): `rounded-xl border border-border/60 bg-card text-card-foreground shadow-xs`

La sombra default paso de `shadow-sm` a `shadow-xs` en Fase 2. El border cambio de `border` a `border-border/60`. Motivo: Finexy-style cards deben flotar sobre `bg-background` con contraste minimo, confiando en el microcontraste de luminosidad (card blanco sobre stone-50) mas que en el elevation visible.

### 5.4 Table

**Import:** `@/components/ui/table`

```tsx
<div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Nombre</TableHead>
        <TableHead>Estado</TableHead>
        <TableHead className="text-right">Acciones</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>CM</AvatarFallback>
            </Avatar>
            <span className="font-medium">Carlos Mendoza</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="success">Activo</Badge>
        </TableCell>
        <TableCell>
          <div className="flex justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

**Estilos de cabecera:** `h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground`
**Estilos de celda:** `px-3 py-2.5 align-middle`
**Hover en filas:** `hover:bg-muted/30`

### 5.5 Input

**Import:** `@/components/ui/input`

- Altura: `h-9`
- Border radius: `rounded-md`
- Focus: `ring-2 ring-ring ring-offset-1`
- Con icono a la izquierda:

```tsx
<div className="relative">
  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input placeholder="Buscar..." className="pl-8" />
</div>
```

### 5.6 Select

**Import:** `@/components/ui/select`

- Mismo estilo que Input (`h-9`, `rounded-md`)
- Incluye `ChevronDown` automatico
- `appearance-none` para ocultar el select nativo

### 5.7 Textarea

**Import:** `@/components/ui/textarea`

- `min-h-[100px]`
- Mismo border/focus que Input

### 5.8 Label

**Import:** `@/components/ui/label`

- Clase: `text-sm font-medium`
- Campos requeridos: agregar `<span className="ml-0.5 text-destructive">*</span>`

### 5.9 Avatar

**Import:** `@/components/ui/avatar`

| Tamano | Clase | Pixel |
|--------|-------|-------|
| `sm` | `size-6` | 24px |
| `default` | `size-8` | 32px |
| `lg` | `size-10` | 40px |

```tsx
<Avatar>
  <AvatarImage src="..." alt="..." />
  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
    CM
  </AvatarFallback>
</Avatar>
```

**AvatarGroup** para multiples avatars superpuestos:
```tsx
<AvatarGroup>
  <Avatar><AvatarFallback>A</AvatarFallback></Avatar>
  <Avatar><AvatarFallback>B</AvatarFallback></Avatar>
  <AvatarGroupCount>+5</AvatarGroupCount>
</AvatarGroup>
```

### 5.10 Checkbox

**Import:** `@/components/ui/checkbox`

- `size-4` (16px)
- `rounded-[4px]`
- Checked: `bg-primary text-primary-foreground`

### 5.11 Switch

**Import:** `@/components/ui/switch`

| Tamano | Track | Thumb |
|--------|-------|-------|
| `default` | `h-5 w-9` | `size-4` |
| `sm` | `h-4 w-7` | `size-3` |

### 5.12 Skeleton

**Import:** `@/components/ui/skeleton`

- Clase: `animate-pulse rounded-md bg-muted`
- Usar en loading states con dimensiones que simulen el contenido real

### 5.13 Separator

**Import:** `@/components/ui/separator`

- Horizontal (default): `h-px w-full bg-border`
- Vertical: `className="mx-1.5 h-6 w-px"` (no soporta prop `orientation`)

### 5.14 Tooltip

**Import:** `@/components/ui/tooltip`

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button size="icon" variant="ghost">
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Editar</TooltipContent>
</Tooltip>
```

- Provider global en `layout.tsx` con `delayDuration={300}`
- Estilo: fondo oscuro invertido (`bg-foreground text-background`)

### 5.15 DropdownMenu

**Import:** `@/components/ui/dropdown-menu`

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon-sm">
      <MoreHorizontal size={16} />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>
      <Pencil className="h-4 w-4" />
      Editar
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive">
      <Trash className="h-4 w-4" />
      Eliminar
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 5.16 Collapsible

**Import:** `@/components/ui/collapsible`

- Usado en sidebar para submenus
- Transicion de `ChevronDown` con `rotate-180` cuando esta abierto

### 5.17 Sheet (Panel lateral)

**Import:** `@/components/ui/sheet`

- Usado para mobile sidebar
- Soporta `side`: `top | right | bottom | left`
- Default: `right`, ancho `w-3/4 sm:max-w-sm`

---

## 6. Patrones de CRUD

### 6.1 Crear / Editar -> Flujo por paginas (obligatorio)

**REGLA**: Crear y Editar usan paginas dedicadas (`/new` y `/[id]`).  
No usar `Dialog` como patron principal de CRUD.

```tsx
// Listado -> alta
<Link href={`${routeBase}/new`}>
  <Button>
    <Plus className="mr-2 h-4 w-4" />
    Nuevo elemento
  </Button>
</Link>

// Listado -> edicion
<Link href={`${routeBase}/${itemId}`}>
  <Button variant="ghost" size="icon" className="h-8 w-8">
    <Pencil className="h-3.5 w-3.5" />
  </Button>
</Link>
```

**Comportamiento esperado del flujo por paginas:**
- Crear (`/new`): submit -> POST -> `toast.success` -> redirect al listado.
- Editar (`/[id]`): submit -> PUT/PATCH -> `toast.success` -> redirect al listado.
- Mantener `PageHeader`, boton "Volver" y estado loading del submit.

### 6.2 Eliminar / Desactivar -> Confirmacion (AlertDialog)

**REGLA**: Eliminar y desactivar SIEMPRE usan `AlertDialog` con confirmacion obligatoria.

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogMedia className="bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </AlertDialogMedia>
      <AlertDialogTitle>¿Desactivar registro?</AlertDialogTitle>
      <AlertDialogDescription>
        Estas a punto de desactivar <strong className="text-foreground">"Nombre"</strong>.
        Este registro no se eliminara permanentemente, pero dejara de estar disponible.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
      <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Procesando...
          </>
        ) : (
          "Desactivar"
        )}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Tamaños de AlertDialog:**
- `size="default"` -> `sm:max-w-lg` (eliminacion con contexto)
- `size="sm"` -> `max-w-xs` (confirmacion rapida)

### 6.3 Flujo Completo de CRUD

```
[Pagina de Listado]
  |
  |-- Boton "Crear nuevo" (esquina superior derecha)
  |     -> Navega a /new (pagina de formulario)
  |     -> onSubmit: POST -> toast.success -> redirect al listado
  |
  |-- Boton "Editar" (en cada fila / card)
  |     -> Navega a /[id] (pagina de formulario prellenado)
  |     -> onSubmit: PUT/PATCH -> toast.success -> redirect al listado
  |
  |-- Boton "Eliminar/Desactivar" (en cada fila / card)
  |     -> Abre AlertDialog de confirmacion
  |     -> onConfirm: DELETE -> toast.success -> recarga lista
```

### 6.4 Layout de Pagina CRUD

```tsx
<div className="space-y-5">
  {/* Header */}
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 className="text-2xl font-bold text-foreground">Titulo</h1>
      <p className="mt-1 text-sm text-muted-foreground">Descripcion</p>
    </div>
    <Link href={`${routeBase}/new`} className="shrink-0">
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Nuevo elemento
      </Button>
    </Link>
  </div>

  {/* Buscador */}
  <div className="relative max-w-sm">
    <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
    <Input placeholder="Buscar..." className="pl-10" />
  </div>

  {/* Tabla */}
  <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
    <Table>...</Table>
  </div>

  {/* Footer */}
  <div className="flex items-center justify-between border-t border-border pt-4">
    <p className="text-sm text-muted-foreground">
      Mostrando <span className="font-medium text-foreground">{filtered}</span> de{" "}
      <span className="font-medium text-foreground">{total}</span> registros
    </p>
  </div>
</div>
```

---

## 7. Componentes Compartidos

### 7.1 PageHeader

**Import:** `@/components/shared/page-header`

Consumido por ~61 paginas del admin. **La firma tipografica del rediseno Ember vive aqui** — el h1 renderiza con `font-display` (Instrument Serif) para dar presencia editorial a los titulos de pagina.

```tsx
<PageHeader
  title="Titulo de la pagina"
  description="Descripcion corta de la seccion."
  breadcrumbs={[                        // Opcional: array de breadcrumbs
    { label: "Dashboard", href: "/dashboard" },
    { label: "Seccion", href: "/dashboard/seccion" },
    { label: "Detalle" },               // El ultimo sin href
  ]}
  actions={<Button>Accion</Button>}     // Opcional: ReactNode
>
  {/* Legacy: `children` tambien se renderiza como actions (retrocompat) */}
</PageHeader>
```

**Estilo aplicado al h1**: `font-display text-3xl font-normal leading-[1.05] tracking-tight text-foreground sm:text-4xl`.

**Reglas**:
- **NO** uses `font-bold` en el h1 — Instrument Serif solo tiene weight 400 en Google Fonts y bold visualmente colapsa el caracter del serif.
- El titulo va en `font-normal` (400) con tracking negativo + leading apretado. Confiar en el peso del serif.
- `text-3xl` en mobile, `text-4xl` en desktop (≥640px).
- Breadcrumbs opcionales con separador chevron, semanticos (`<nav aria-label="Breadcrumb">`).
- Description tiene `max-w-prose` para que no se estire todo el ancho.
- Actions se agrupan a la derecha en desktop, debajo en mobile.

### 7.2 EmptyState

**Import:** `@/components/shared/empty-state`

```tsx
<EmptyState
  icon={Inbox}                    // Default: Inbox
  title="Sin registros"
  description="Ajusta tus filtros o agrega un nuevo elemento."
  action={<Button size="sm">Crear</Button>}  // Opcional
/>
```

- Envuelto en `Card` con `border-dashed`
- Icono en circulo `h-12 w-12 rounded-full bg-muted`
- Centrado: `flex-col items-center justify-center px-6 py-12 text-center`

### 7.3 LoadingSkeleton

**Import:** `@/components/shared/loading-skeleton`

```tsx
<LoadingSkeleton rows={5} />
```

- Simula toolbar + tabla con Skeleton pulses
- Envuelto en Card

### 7.4 StatusBadge

**Import:** `@/components/ui/status-badge` (vive en `ui/`, no `shared/`, desde Fase 3)

Componente unificado para **todos los badges de status de dominio**. Reemplaza el patron anterior de "un wrapper por feature hardcodeando colores por estado". Los 7 wrappers existentes (`investiture-status-badge`, `pipeline-status-badge`, `folder-status-badge`, `evidence-status-badge`, `evidence-type-badge`, `validation-status-badge`, `request-status-badge`) son ahora thin wrappers sobre `StatusBadge` que solo mapean enums de dominio al intent generico.

**API:**

```tsx
<StatusBadge
  intent="success"                     // Requerido: ver tabla abajo
  label="Aprobado"                     // Requerido: string
  icon={CheckCircle2}                  // Opcional: LucideIcon
  size="default"                       // Opcional: "xs" | "sm" | "default"
  className="..."                      // Opcional: overrides
/>
```

**Intents disponibles (9)**:

| Intent | Badge variant usado | Uso |
|--------|---------------------|-----|
| `neutral` | `outline` | Estados inactivos, "sin enviar", draft |
| `info` | `soft-info` | Enviado, en cola, info general |
| `success` | `soft-success` | Aprobado, validado, completado |
| `warning` | `soft-warning` | Pendiente, necesita atencion |
| `destructive` | `destructive` (pleno) | Rechazado, fallo |
| `primary` | `soft` | Estado final positivo (ej. investido) |
| `progress-1` | `outline` + chart-1 tint | Pipeline stage 1 (ej. aprobado por director) |
| `progress-2` | `outline` + chart-2 tint | Pipeline stage 2 (ej. aprobado por coordinacion) |
| `progress-3` | `outline` + chart-3 tint | Pipeline stage 3 (ej. aprobado por campo) |

**Los `progress-*`** reutilizan los chart tokens (`--chart-1/2/3`) con `color-mix(in oklch, ..., transparent)` para tints translucidos. Representan progresion ordenada en pipelines (ej. el pipeline de investidura tiene 3 etapas antes de `INVESTED`). Cada stage se ve con un tono distinto de la paleta ordenada de charts.

**Patron wrapper feature-specific** (ejemplo real):

```tsx
// src/components/investiture/investiture-status-badge.tsx
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import type { InvestitureStatus } from "@/lib/api/investiture";

const statusMap: Record<InvestitureStatus, { label: string; intent: StatusIntent }> = {
  IN_PROGRESS: { label: "En progreso", intent: "neutral" },
  SUBMITTED: { label: "Enviado", intent: "warning" },
  CLUB_APPROVED: { label: "Aprobado por club", intent: "progress-1" },
  COORDINATOR_APPROVED: { label: "Aprobado por coordinacion", intent: "progress-2" },
  FIELD_APPROVED: { label: "Aprobado por campo", intent: "progress-3" },
  APPROVED: { label: "Aprobado", intent: "success" },
  REJECTED: { label: "Rechazado", intent: "destructive" },
  INVESTED: { label: "Investido", intent: "primary" },
};

export function InvestitureStatusBadge({ status }: { status: InvestitureStatus }) {
  const config = statusMap[status] ?? { label: status, intent: "neutral" as StatusIntent };
  return <StatusBadge intent={config.intent} label={config.label} />;
}
```

**Reglas**:
- **NO** pongas logica de dominio dentro de `StatusBadge` — el componente no sabe que es "SUBMITTED". Los wrappers feature-specific son los unicos que conocen enums del backend.
- **NO** dupliques estilos — siempre delegar a `<Badge variant="soft-*">`. La unica excepcion son los 3 `progress-*` que usan `color-mix` + `var(--chart-N)` inline.
- Cuando el backend cambia un enum (ej. la migracion `20260413130000` que paso evidence status a uppercase), hay que actualizar el map del wrapper correspondiente.

### 7.5 DataTable

**Import:** `@/components/shared/data-table`

Tabla completa con busqueda integrada, basada en TanStack Table.

```tsx
<DataTable
  columns={[
    { key: "name", title: "Nombre", render: (item) => item.name, searchableValue: (item) => item.name },
    { key: "status", title: "Estado", render: (item) => <StatusBadge active={item.active} /> },
  ]}
  rows={items}
  searchPlaceholder="Buscar miembros..."
  emptyTitle="Sin miembros"
  emptyDescription="No hay miembros registrados aun."
/>
```

### 7.6 DataTablePagination

**Import:** `@/components/shared/data-table-pagination`

```tsx
<DataTablePagination page={1} totalPages={5} onPageChange={setPage} />
```

### 7.7 ConfirmDialog

**Import:** `@/components/shared/confirm-dialog`

Wrapper reutilizable de AlertDialog para acciones destructivas.

```tsx
<ConfirmDialog
  title="¿Desactivar usuario?"
  description="El usuario dejara de tener acceso al sistema."
  triggerLabel="Desactivar"
  confirmLabel="Si, desactivar"
  onConfirm={async () => { await deleteUser(id); }}
  triggerVariant="destructive"
/>
```

### 7.8 CatalogFormPage

**Import:** `@/components/catalogs/catalog-form-page`

Componente de pagina para formularios CRUD de catalogos.  
Exponer `CatalogNewPage` y `CatalogEditPage` como patron oficial para `/new` y `/[id]`.

### 7.9 CatalogDeleteDialog

**Import:** `@/components/catalogs/catalog-delete-dialog`

AlertDialog generico para desactivacion de registros de catalogo.

### 7.10 AppToaster

**Import:** `@/components/shared/app-toaster`

- Provider global de Sonner
- Posicion: `top-right`
- `richColors` habilitado
- `closeButton` habilitado

**Uso de toasts:**
```tsx
import { toast } from "sonner";

toast.success("Registro creado correctamente");
toast.error("Error al guardar el registro");
toast.warning("El registro ya existe");
```

---

## 8. Iconos

### 8.1 Libreria

Todos los iconos provienen de `lucide-react`. No usar ninguna otra libreria de iconos.

### 8.2 Tamanos Estandar

| Contexto | Tamano | Clase |
|----------|--------|-------|
| Sidebar nav | 18x18 | `h-[18px] w-[18px]` |
| Sidebar submenu | 14x14 | `h-3.5 w-3.5` |
| Header actions | 18px | `size={18}` |
| Botones con texto | 16px | `size={16}` |
| Tabla acciones | 14x14 | `h-3.5 w-3.5` |
| KPI cards | 18px | `size={18}` |
| Indicadores inline | 14px | `size={14}` |
| Hero / Login | 32x32 | `h-8 w-8` |

### 8.3 Contenedores de Iconos

```tsx
// Contenedor cuadrado (KPI, feature cards)
<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
  <Icon size={18} className="text-primary" />
</div>

// Contenedor circular (empty states, avatars)
<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
  <Icon className="h-5 w-5 text-muted-foreground" />
</div>

// Contenedor circular pequeno (pasos, timeline)
<div className="flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground">
  <Icon className="h-4 w-4" />
</div>
```

### 8.4 Iconos por Contexto

| Accion | Icono | Import |
|--------|-------|--------|
| Crear/Agregar | `Plus` | `lucide-react` |
| Editar | `Pencil` | `lucide-react` |
| Eliminar/Desactivar | `Ban` o `Trash2` | `lucide-react` |
| Buscar | `Search` | `lucide-react` |
| Menu de acciones | `MoreHorizontal` | `lucide-react` |
| Cerrar | `X` | `lucide-react` |
| Cargando | `Loader2` con `animate-spin` | `lucide-react` |
| Alerta/Error | `AlertTriangle` o `AlertCircle` | `lucide-react` |
| Exito | `Check` o `CheckCircle` | `lucide-react` |
| Expandir | `ChevronDown` con rotacion | `lucide-react` |
| Link externo | `ArrowUpRight` | `lucide-react` |
| Tendencia positiva | `TrendingUp` | `lucide-react` |
| Tendencia negativa | `TrendingDown` | `lucide-react` |

---

## 9. Animaciones y Transiciones

### 9.1 Micro-interacciones

| Elemento | Propiedad | Valor |
|----------|-----------|-------|
| Cards hover | border + shadow | `transition-all hover:border-primary/20 hover:shadow-md` |
| Card title hover | color | `transition-colors group-hover:text-primary` |
| Botones | todos | `transition-all` (incluido en buttonVariants) |
| Nav items | background + color | `transition-colors` |
| Filas de tabla | background | `transition-colors hover:bg-muted/30` |
| Chevron submenu | rotacion | `transition-transform duration-200` |
| Inputs focus | ring | `transition-colors` |

### 9.2 Animaciones de Entrada (tw-animate-css)

```tsx
// Filas de tabla con stagger
<TableRow
  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
  style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
/>

// Elementos que aparecen
className="animate-in fade-in duration-300"

// Error messages
className="animate-in fade-in slide-in-from-top-1"
```

### 9.3 Animaciones de Modales

Los componentes Dialog y AlertDialog incluyen automaticamente:
- `data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95`
- `data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95`

### 9.4 Animaciones Customizadas (Login)

```css
/* Orbes flotantes */
.animate-float-slow    { animation: float-slow 20s ease-in-out infinite; }
.animate-float-medium  { animation: float-medium 15s ease-in-out infinite; }
.animate-float-fast    { animation: float-fast 12s ease-in-out infinite; }

/* Fade up para entrada de pagina */
.animate-fade-up { animation: fade-up 0.5s ease-out forwards; }
```

### 9.5 Loading States

```tsx
// Spinner en boton
<Button disabled={loading}>
  {loading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Procesando...
    </>
  ) : (
    "Guardar"
  )}
</Button>

// Spinner centrado en pagina
<div className="flex items-center justify-center py-20">
  <Loader2 className="h-8 w-8 animate-spin text-primary" />
</div>

// Skeleton loading
<LoadingSkeleton rows={5} />
```

---

## 10. Layout y Navegacion

### 10.1 Estructura del Dashboard

```
+-------------------------------------------------------------------+
| Sidebar (w-60)  |  Header (h-14, sticky)                         |
| - Brand logo    |  [Mobile menu] [Breadcrumbs] ... [Search]      |
| - Nav groups    |  [Theme] [Notifications] [User]                |
| - Separators    |                                                 |
|                 +------------------------------------------------+
|                 |  Main content (p-4 md:p-6)                     |
|                 |  - PageHeader                                  |
|                 |  - Content area (space-y-6)                    |
|                 |  - Footer                                      |
+-------------------------------------------------------------------+
```

### 10.2 Sidebar

- Ancho fijo: `w-60` (240px, set via `--sidebar-width: 15rem` en SidebarProvider)
- Oculto en mobile (`hidden md:block`)
- Mobile: usa `Sheet` (panel lateral)
- Brand: icono `h-8 w-8 rounded-lg` + nombre `text-lg font-bold`
- Grupos separados por `Separator` y labels `text-[10px] uppercase`
- Items activos: `bg-sidebar-accent text-sidebar-accent-foreground`
- Items hover: `hover:bg-sidebar-accent/50`
- Submenus: `Collapsible` con borde izquierdo `border-l border-sidebar-border`
- Scrollbar custom: `custom-scrollbar`

### 10.3 Header

- Altura: `h-14` (56px, reducido de 64px en Fase 4 para ganar espacio vertical)
- Sticky: `sticky top-0 z-30`
- Background: `bg-card/80 backdrop-blur-sm`
- Border: `border-b border-border`
- Contenido: Breadcrumbs (izquierda) | Acciones (derecha)
- Acciones: Buscador | Separator | ThemeToggle | Notificaciones | Separator | UserNav
- Buscador: visible solo en `md:`
- Separadores verticales: `Separator className="mx-1.5 h-6 w-px"`

### 10.4 Breadcrumbs

- Formato: `Dashboard / Seccion / Subseccion`
- Separador: `/`
- Link activo: `text-foreground font-medium`
- Links anteriores: `text-muted-foreground hover:text-foreground`

---

## 11. Formularios

### 11.1 Estructura de Campo

```tsx
<div className="space-y-2">
  <Label htmlFor="fieldName">
    Nombre del campo
    {required && <span className="ml-0.5 text-destructive">*</span>}
  </Label>
  <Input
    id="fieldName"
    name="fieldName"
    placeholder="Escribe aqui..."
    required
  />
</div>
```

### 11.2 Validacion

- **Client-side**: Zod schemas con React Hook Form
- **Server-side**: Server actions con validacion Zod
- **Errores inline**: `text-destructive` debajo del campo
- **Error general**: Banner con borde destructive

```tsx
{error && (
  <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
    {error}
  </p>
)}
```

### 11.3 Tipos de Campo

| Tipo | Componente | Notas |
|------|-----------|-------|
| Texto | `Input type="text"` | - |
| Email | `Input type="email"` | - |
| Password | `Input type="password"` | Con icono `Lock` a la izquierda |
| Numero | `Input type="number"` | - |
| Fecha | `Input type="date"` | Formato `yyyy-MM-dd` |
| Texto largo | `Textarea` | `rows={3}` minimo |
| Booleano | `Switch` | Con label inline a la derecha |
| Seleccion | `Select` | Con opciones `<option>` |
| Checkbox | `Checkbox` | Para aceptaciones o multi-select |

### 11.4 Formularios en Modales (solo excepciones)

- Espaciado entre campos: `space-y-4`
- Padding del form: `py-2`
- Footer: `DialogFooter className="gap-2 pt-2"`
- Boton cancelar: `variant="outline"`
- Boton submit: `variant="default"` (primario)
- Estado loading: texto del boton cambia + `disabled`
- Usar modal solo en casos puntuales no-CRUD principal.

---

## 12. Patrones de Presentacion de Datos

### 12.1 Tarjetas KPI / Estadisticas

```tsx
<Card className="group transition-all hover:border-primary/20">
  <CardContent className="p-5">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <Icon size={18} className="text-primary" />
      </div>
    </div>
    <div className="mt-3">
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <div className="mt-2 flex items-center gap-1 text-xs font-medium">
        <TrendingUp size={14} className="text-success" />
        <span className="text-success">+12.5%</span>
        <span className="ml-1 text-muted-foreground">vs mes anterior</span>
      </div>
    </div>
  </CardContent>
</Card>
```

### 12.2 Progress Bars

```tsx
<div className="h-2 rounded-full bg-muted">
  <div
    className="h-full rounded-full transition-all duration-500"
    style={{ width: `${percentage}%`, backgroundColor: color }}
  />
</div>
```

### 12.3 Graficos (Recharts)

- Usar CSS variables para colores: `var(--chart-1)`, `var(--chart-2)`, etc.
- `CartesianGrid`: `className="stroke-border" strokeOpacity={0.5} strokeDasharray="3 3"`
- Ejes: `tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false}`
- Gradientes para areas: opacity 0.3 arriba -> 0 abajo
- Tooltip custom con `bg-card border-border shadow-xl`

### 12.4 Timeline / Pasos

```tsx
<div className="relative">
  {/* Linea vertical */}
  <div className="absolute left-[19px] top-3 h-[calc(100%-24px)] w-px bg-border" />
  <div className="space-y-4">
    {steps.map((step, i) => (
      <div key={step.title} className="relative flex items-start gap-4 pl-1">
        <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="pt-1">
          <Badge variant="outline" className="text-[10px]">Fase {i + 1}</Badge>
          <p className="mt-1 text-sm font-medium">{step.title}</p>
          <p className="text-xs text-muted-foreground">{step.description}</p>
        </div>
      </div>
    ))}
  </div>
</div>
```

### 12.5 Listas Descriptivas (Mobile Cards)

```tsx
<div className="rounded-xl border border-border bg-card p-4">
  <div className="mb-2 flex items-center justify-between">
    <Badge variant="success">Activo</Badge>
    <div className="flex gap-1">
      <Button size="sm" variant="ghost">Editar</Button>
    </div>
  </div>
  <dl className="space-y-1.5">
    <div className="flex items-baseline justify-between gap-2">
      <dt className="shrink-0 text-xs text-muted-foreground">Campo</dt>
      <dd className="truncate text-right text-sm">Valor</dd>
    </div>
  </dl>
</div>
```

---

## 13. Dark Mode

### 13.1 Configuracion

```tsx
// layout.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="dark"    // Dark por defecto
  enableSystem={false}
  disableTransitionOnChange
/>
```

- Selector CSS: `@custom-variant dark (&:is(.dark *));`
- Theme toggle: `next-themes` con `useTheme()`

### 13.2 Reglas de Compatibilidad

```
HACER:
  bg-primary/10        -> Funciona en ambos modos
  text-muted-foreground -> Se adapta automaticamente
  bg-card              -> Blanco en light, navy en dark
  border-border        -> Se adapta automaticamente

EVITAR POR DEFECTO:
  bg-blue-50           -> No se adapta a dark mode
  text-gray-600        -> Usar text-muted-foreground
  bg-white             -> Usar bg-card o bg-background
  border-gray-200      -> Usar border-border
  Colores hardcoded sin validacion en ambos temas

EXCEPCION:
  Se permiten colores hardcoded cuando se solicite explicitamente una mejora visual
  y se valide en light/dark + contraste minimo.
```

### 13.3 Patrones Dark Mode

```tsx
// Correcto: usar tokens semanticos
className="bg-primary/10 text-primary"
className="bg-destructive/10 text-destructive"
className="bg-muted text-muted-foreground"

// Evitar por defecto: colores que no se adaptan
className="bg-blue-50 text-blue-600"
className="bg-amber-100 text-amber-800"
```

### 13.4 Login (Dark-only)

La pagina de login siempre usa fondo oscuro (`bg-[#101022]`) con:
- Card: `bg-[#16162c] border-white/10`
- Texto: `text-white`, `text-slate-400`, `text-white/40`
- Inputs: `border-slate-700 bg-slate-900/50 text-white`

---

## 14. Responsive Design

### 14.1 Estrategia

- **Mobile-first**: Clases base para mobile, `md:` para desktop
- **Sidebar**: Oculto en mobile, Sheet como alternativa
- **Tablas**: Desktop tabla / Mobile cards (patron dual)
- **Grids**: 1 columna -> 2 columnas -> 3-4 columnas

### 14.2 Patrones Comunes

```tsx
// Grid responsive
className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"

// Ocultar en mobile
className="hidden md:block"
className="hidden md:table-cell"

// Mostrar solo en mobile
className="md:hidden"

// Header responsive
className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"

// Padding responsive
className="p-4 md:p-6"
```

---

## 15. Toasts y Notificaciones

### 15.1 Posicion y Config

- Posicion: `top-right`
- Rich colors: habilitado
- Close button: habilitado

### 15.2 Patrones de Uso

```tsx
// Exito despues de crear
toast.success(`${entityName} creado correctamente`);

// Exito despues de editar
toast.success(`${entityName} actualizado correctamente`);

// Exito despues de eliminar
toast.success(`${entityName} desactivado correctamente`);

// Error
toast.error("Error al guardar el registro");
toast.error(state.error); // De server action

// Login error
toast.error(state.error); // Muestra en toast + inline
```

---

## 16. Scrollbar Personalizado

```css
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.15);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.3);
}
```

Aplicar con `className="custom-scrollbar"` en contenedores con scroll.

---

## 17. Acciones en Tablas

### 17.1 Patron con Tooltip + Icono

```tsx
<div className="flex justify-end gap-1">
  <Tooltip>
    <TooltipTrigger asChild>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(item)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Editar</TooltipContent>
  </Tooltip>

  <Tooltip>
    <TooltipTrigger asChild>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(item)}>
        <Ban className="h-3.5 w-3.5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Desactivar</TooltipContent>
  </Tooltip>
</div>
```

### 17.2 Patron con DropdownMenu (mas de 2 acciones)

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon-sm">
      <MoreHorizontal size={16} />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => handleEdit(item)}>
      <Pencil className="h-4 w-4" />
      Editar
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleView(item)}>
      <Eye className="h-4 w-4" />
      Ver detalle
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onClick={() => handleDelete(item)}>
      <Trash2 className="h-4 w-4" />
      Eliminar
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Regla**: Usar Tooltip+iconos cuando hay 1-2 acciones. Usar DropdownMenu cuando hay 3+ acciones.

---

## 18. Idioma y Textos

- **Idioma por defecto**: espanol (es-MX)
- **Preparado para i18n**: textos de UI, `aria-label`, `title`, `sr-only`, tooltips y validaciones deben poder traducirse.
- **Formato de numeros**: usar locale activo (`new Intl.NumberFormat(locale)`), fallback `es-MX`.
- **Formato de fechas**: locale activo (default `es-MX`), formato principal `dd/MM/yyyy`.
- **Textos de botones**: Verbos en infinitivo ("Crear", "Editar", "Guardar", "Cancelar")
- **Confirmaciones**: Pregunta + descripcion ("¿Desactivar registro?" + contexto)
- **Mensajes vacios**: "Sin registros" + descripcion + accion opcional
- **Loading text**: Gerundio ("Guardando...", "Procesando...", "Verificando...")

---

## 19. Estructura de Archivos

```
src/
├── app/
│   ├── (auth)/              # Rutas de autenticacion (login)
│   │   ├── layout.tsx       # Layout con orbes animados
│   │   └── login/page.tsx
│   ├── dashboard/           # Rutas protegidas
│   │   ├── layout.tsx       # Sidebar + Header + main
│   │   ├── page.tsx         # Dashboard home
│   │   ├── catalogs/        # Modulos CRUD de catalogos
│   │   ├── rbac/            # Roles y permisos
│   │   └── [modulo]/        # Cada modulo del sistema
│   ├── layout.tsx           # Root layout (ThemeProvider, TooltipProvider, Toaster)
│   └── globals.css          # Tokens de color, animaciones
├── components/
│   ├── ui/                  # Componentes base shadcn/Radix
│   │   ├── alert-dialog.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── collapsible.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── skeleton.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── textarea.tsx
│   │   └── tooltip.tsx
│   ├── shared/              # Componentes reutilizables
│   │   ├── app-toaster.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── data-table.tsx
│   │   ├── data-table-pagination.tsx
│   │   ├── data-table-toolbar.tsx
│   │   ├── empty-state.tsx
│   │   ├── loading-skeleton.tsx
│   │   ├── page-header.tsx
│   │   └── status-badge.tsx
│   ├── layout/              # Componentes de layout
│   │   ├── app-sidebar.tsx
│   │   ├── breadcrumbs.tsx
│   │   ├── header.tsx
│   │   ├── mobile-sidebar.tsx
│   │   ├── nav-items.ts
│   │   └── user-nav.tsx
│   ├── catalogs/            # Componentes de catalogos CRUD
│   │   ├── catalog-crud-page.tsx
│   │   ├── catalog-form-dialog.tsx
│   │   ├── catalog-delete-dialog.tsx
│   │   └── ...
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
└── lib/
    ├── utils.ts             # cn() utility
    ├── auth/                # Autenticación JWT + Better Auth
    ├── catalogs/            # Logica de catalogos
    └── providers/           # React Query, etc.
```

---

## 20. Checklist para Nuevas Interfaces

Antes de entregar cualquier nueva pantalla o componente, verificar:

- [ ] Solo usa componentes de `@/components/ui/*` (nunca HTML nativo para inputs, botones, tablas)
- [ ] Excepciones de HTML nativo documentadas (ej. `input hidden`, integraciones sin wrapper)
- [ ] Colores usan tokens semanticos por defecto (hardcoded solo por solicitud visual explicita)
- [ ] Funciona correctamente en dark mode
- [ ] Formularios de crear/editar usan flujo por paginas (`/new`, `/[id]`)
- [ ] Eliminaciones usan `AlertDialog` con confirmacion
- [ ] Iconos son de `lucide-react` con tamanos estandar
- [ ] Textos en espanol por defecto y listos para i18n
- [ ] Loading states implementados (Skeleton o Loader2)
- [ ] Empty states implementados (EmptyState component)
- [ ] Errores mostrados con estilo destructive
- [ ] Toasts para feedback de acciones
- [ ] Responsive (mobile cards + desktop tabla si aplica)
- [ ] Hover/focus states presentes en elementos interactivos
- [ ] `PageHeader` usado como encabezado de pagina
- [ ] Footer con conteo de registros si es listado
- [ ] Acciones en tabla con Tooltip (1-2 acciones) o DropdownMenu (3+)
- [ ] No hay imports sin usar
- [ ] `pnpm build` compila sin errores
