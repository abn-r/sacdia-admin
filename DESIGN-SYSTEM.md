# SACDIA Admin - Design System & Style Guide

> Documento de referencia para todas las interfaces del panel administrativo.
> Cada nueva pantalla, componente o modal debe seguir estas definiciones.

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

## 2. Paleta de Color (OKLCH)

El sistema usa CSS custom properties en OKLCH para precision de color perceptual. Todas las clases de Tailwind referencian estos tokens.

### 2.1 Tokens de Superficie

| Token | Light Mode | Dark Mode | Uso |
|-------|-----------|-----------|-----|
| `--background` | `oklch(0.985 0.001 75)` | `oklch(0.16 0.025 280)` | Fondo general de la app |
| `--foreground` | `oklch(0.147 0.004 49.25)` | `oklch(1 0 0)` | Texto principal |
| `--card` | `oklch(1 0 0)` | `oklch(0.195 0.028 280)` | Fondo de tarjetas |
| `--card-foreground` | `oklch(0.147 0.004 49.25)` | `oklch(1 0 0)` | Texto en tarjetas |
| `--popover` | `oklch(1 0 0)` | `oklch(0.195 0.028 280)` | Fondo de popovers/menus |
| `--muted` | `oklch(0.97 0.001 75)` | `oklch(0.22 0.025 280)` | Superficies secundarias |
| `--muted-foreground` | `oklch(0.553 0.013 58)` | `oklch(0.65 0.02 250)` | Texto secundario/auxiliar |
| `--accent` | `oklch(0.97 0.001 75)` | `oklch(0.395 0.27 264 / 10%)` | Hover backgrounds |
| `--secondary` | `oklch(0.97 0.001 75)` | `oklch(0.22 0.025 280)` | Botones secundarios |

### 2.2 Colores Semanticos

| Token | Light | Dark | Clase Tailwind | Uso |
|-------|-------|------|----------------|-----|
| `--primary` | `oklch(0.395 0.27 264)` | `oklch(0.395 0.27 264)` | `text-primary`, `bg-primary` | Acciones principales, enlaces, brand |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.65 0.2 25)` | `text-destructive`, `bg-destructive` | Errores, eliminaciones, alertas |
| `--success` | `oklch(0.52 0.17 152)` | `oklch(0.62 0.17 152)` | `text-success`, `bg-success` | Estados activos, confirmaciones |
| `--warning` | `oklch(0.75 0.15 80)` | `oklch(0.78 0.14 80)` | `text-warning`, `bg-warning` | Advertencias, estados pendientes |

### 2.3 Colores de Borde e Input

| Token | Light | Dark |
|-------|-------|------|
| `--border` | `oklch(0.923 0.003 48.72)` | `oklch(0.6 0.02 250 / 15%)` |
| `--input` | `oklch(0.923 0.003 48.72)` | `oklch(0.6 0.02 250 / 12%)` |
| `--ring` | `oklch(0.395 0.27 264)` | `oklch(0.395 0.27 264)` |

### 2.4 Colores de Grafico

| Token | Uso | Clase |
|-------|-----|-------|
| `--chart-1` | Serie primaria | `var(--chart-1)` |
| `--chart-2` | Serie secundaria | `var(--chart-2)` |
| `--chart-3` | Serie terciaria | `var(--chart-3)` |
| `--chart-4` | Serie cuaternaria (success-like) | `var(--chart-4)` |
| `--chart-5` | Serie quinaria (warning-like) | `var(--chart-5)` |

### 2.5 Colores de Sidebar

| Token | Uso |
|-------|-----|
| `--sidebar` | Fondo del sidebar |
| `--sidebar-foreground` | Texto normal del sidebar |
| `--sidebar-primary` | Color primario del sidebar (= primary) |
| `--sidebar-accent` | Background hover/activo en sidebar |
| `--sidebar-border` | Borde del sidebar |

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

| Variable | Stack | Uso |
|----------|-------|-----|
| `--font-geist-sans` | `"Inter", "SF Pro Display", -apple-system, sans-serif` | Todo el texto de la app |
| `--font-geist-mono` | `"JetBrains Mono", "SF Mono", monospace` | Codigo, valores tabulares |

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

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius` | `0.5rem` (8px) | Base |
| `--radius-sm` | `calc(var(--radius) - 4px)` = 4px | Checkboxes, badges pequeños |
| `--radius-md` | `calc(var(--radius) - 2px)` = 6px | Inputs, buttons |
| `--radius-lg` | `var(--radius)` = 8px | Cards, dialogs |
| `--radius-xl` | `calc(var(--radius) + 4px)` = 12px | Cards grandes, login |
| `--radius-2xl` | `calc(var(--radius) + 8px)` = 16px | Elementos especiales |

**Clases principales:**
- `rounded-md` -> Inputs, buttons, selects (6px)
- `rounded-lg` -> Sidebar items, icons containers (8px)
- `rounded-xl` -> Cards, modals, containers principales (12px)
- `rounded-full` -> Avatars, dots, badges circulares

### 4.2 Grid del Dashboard

```
Layout principal:
  Sidebar (w-64, sticky top-0, h-screen) | Contenido (flex-1)

Contenido:
  Header (h-16, sticky top-0, border-b)
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
| `default` | Acciones primarias (Crear, Guardar) | `bg-primary text-primary-foreground` |
| `destructive` | Eliminar, desactivar | `bg-destructive text-white` |
| `outline` | Acciones secundarias, filtros, cancelar | `border bg-background` |
| `secondary` | Alternativa neutra | `bg-secondary text-secondary-foreground` |
| `ghost` | Iconos, acciones sutiles en tablas | `hover:bg-accent` |
| `link` | Links en texto, "Ver todos" | `text-primary underline-offset-4` |
| `success` | Confirmaciones positivas | `bg-success text-success-foreground` |

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

| Variante | Uso | Estilo |
|----------|-----|--------|
| `default` | Tags genericos, conteos | `bg-primary/10 text-primary border-primary/20` |
| `secondary` | Labels neutros | `bg-secondary text-secondary-foreground` |
| `success` | Estado activo | `bg-success/10 text-success border-success/20` |
| `destructive` | Estado error/inactivo | `bg-destructive/10 text-destructive` |
| `warning` | Estado pendiente | `bg-warning/10 text-warning-foreground` |
| `outline` | Etiquetas sutiles | `bg-transparent text-foreground border-border` |

**Patron de uso:**
```tsx
<Badge variant="success">Activo</Badge>
<Badge variant="warning">Pendiente</Badge>
<Badge variant="destructive">Inactivo</Badge>
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

**Clases base de Card:** `rounded-xl border bg-card text-card-foreground shadow-sm`

### 5.4 Table

**Import:** `@/components/ui/table`

```tsx
<div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
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
  <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
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

```tsx
<PageHeader
  icon={ShieldCheck}           // Opcional: LucideIcon
  title="Titulo de la pagina"
  description="Descripcion corta de la seccion."
  actions={<Button>Accion</Button>}  // Opcional: ReactNode
/>
```

- Icono en contenedor `h-9 w-9 rounded-lg bg-primary/10 text-primary`
- Titulo: `text-xl font-semibold tracking-tight`
- Descripcion: `text-[13px] text-muted-foreground`

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

**Import:** `@/components/shared/status-badge`

```tsx
<StatusBadge active={true} />  // -> Badge variant="success" "Activo"
<StatusBadge active={false} /> // -> Badge variant="destructive" "Inactivo"
```

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
| Sidebar (w-64)  |  Header (h-16, sticky)                         |
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

- Ancho fijo: `w-64`
- Oculto en mobile (`hidden md:block`)
- Mobile: usa `Sheet` (panel lateral)
- Brand: icono `h-8 w-8 rounded-lg` + nombre `text-lg font-bold`
- Grupos separados por `Separator` y labels `text-[10px] uppercase`
- Items activos: `bg-sidebar-accent text-sidebar-accent-foreground`
- Items hover: `hover:bg-sidebar-accent/50`
- Submenus: `Collapsible` con borde izquierdo `border-l border-sidebar-border`
- Scrollbar custom: `custom-scrollbar`

### 10.3 Header

- Altura: `h-16`
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
    ├── auth/                # Autenticacion Supabase
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
