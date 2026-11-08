# SACDIA Admin - Design System

> Fuente única del diseño del panel. Describe el código **actual** de `development`.
> Si el código y este documento difieren, es un error del documento: corrígelo en el mismo PR.
> Valores de color, sombras y motion salen de `src/app/globals.css` y `src/lib/animations.ts`; no los copies a otro sitio.
> Es también el `DESIGN.md` del plugin antislop: la dirección está en §0.

Cómo leerlo: §2-§4 son tokens, §5-§8 primitivos y superficies, §9-§13 shell, componentes compartidos y patrones de pantalla, §14-§17 CRUD, catálogos, formularios y tablas, §18-§22 transversales, §23 audit y checklist. El historial está al final (§25).

---

## 0. Dirección antislop

El filtro de antislop se aplica sobre esta dirección. Si chocan, manda este documento y se anota la excepción.

Dial: **ENERGY 1 / RHYTHM 2 / MOTION 1**

- **ENERGY 1**: herramienta de trabajo; calmada, sin decoración que compita con los datos.
- **RHYTHM 2**: cada sección toma la composición que pide su contenido; no se repite la misma plantilla de cards.
- **MOTION 1**: solo hover/focus y transiciones funcionales (§7). Sin loops ni entradas decorativas en el dashboard.

Decisiones con razón escrita:

- **Geist** en todo el panel (Geist Mono para código y valores técnicos): sans neutra, pesos reales, legible en pantallas densas.
- **Hugeicons** como librería de iconos: decisión de identidad. El alias `lucide-react` es solo compatibilidad (§6).
- **Neutros puros + un acento** (azul del logo `#0073EA`). El color de estado vive en el texto y el ícono, no en rellenos grandes.
- **Elevación por sombra con anillo hairline**, no por bordes (§8).
- **Radios por rol** (§4.1).

Prohibido en todo el panel (las reglas marcadas se verifican con `pnpm audit:design-system`, §23):

| Prohibido | Alternativa |
|---|---|
| Cajas decorativas de ícono (tile `bg-primary/10` con ícono) | Ícono suelto o `bg-muted` + `text-foreground` solo si identifica la entidad |
| Franjas de color laterales en tarjetas o filas (`side-stripe`) | Un marcador de estado (`StatusBadge`) |
| Bandas de color en cabeceras de tabla o tarjeta | Cabecera sin fondo (§11) |
| Degradados, glass, `backdrop-blur` en superficies de trabajo, glows `blur-3xl` | Superficie plana + sombra token |
| Badges de colores por categoría (arcoíris) | `--chart-*` / `--cat-*` / `--section-*` (§2.5) |
| `window.confirm` (`window-confirm`) | `AlertDialog` (§14.2) |
| Texto de paginación escrito a mano (`hardcoded-pagination`) | `DataTablePagination` |
| Español escrito a mano en JSX fuera de i18n (`hardcoded-spanish-ui`) | `next-intl` (§21) |
| `uppercase` + `tracking-*` (`uppercase-tracking`) | Sentence case |
| `rounded-3xl` / `rounded-4xl` (`pill-radius`) | Radio por rol |
| `transition-all`, `ease-in`, `scale(0)` | Propiedades nombradas, `--ease-out-expo` |

---

## 1. Stack de UI

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Componentes | shadcn/ui (`components.json`: estilo `radix-maia`, `iconLibrary: hugeicons`), primitivos `radix-ui` |
| Estilos | Tailwind CSS v4 + `tw-animate-css`; tokens en `@theme inline` de `globals.css` |
| Iconos | Hugeicons (`@hugeicons/react`, `@hugeicons/core-free-icons`) + shim `lucide-react` (§6) |
| Gráficos | Recharts 3 (`ui/chart.tsx`) |
| Formularios | React Hook Form + Zod; server actions con `fieldErrors` |
| Tablas cliente | TanStack Table (`@tanstack/react-table`) |
| Toasts | Sonner 2 (`ui/sonner.tsx`) |
| Temas | Preferencias SACDIA (cookie `theme_mode` + `ThemeBootScript`), sin `next-themes` |
| i18n | next-intl, 4 idiomas (`es` base, `en`, `fr`, `pt-BR`) |
| Utilidad | `cn()` (`clsx` + `tailwind-merge`) |

**Regla**: todo elemento interactivo visible sale de `@/components/ui/*`. Si falta uno, se instala con shadcn. Excepciones: `<input type="hidden">`, elementos nativos exigidos por APIs del navegador o integraciones sin wrapper (documentarlo en el PR), y `global-error.tsx` (§13.4).

---

## 2. Color

Los tokens son variables CSS en `:root` y `.dark` de `globals.css`, expuestas a Tailwind con `@theme inline` (`bg-card`, `text-muted-foreground`, `border-border`…). Usa siempre el token semántico; no uses la paleta de Tailwind (`bg-blue-50`, `text-red-500`): las reglas `tailwind-palette-bg` / `tailwind-palette-text` avisan.

### 2.1 Superficies y texto

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--background` | `#FFFFFF` | `#0A0A0A` | Fondo general, inputs |
| `--foreground` | `#0A0A0A` | `#EDEDED` | Texto principal |
| `--card` / `--card-foreground` | `#FFFFFF` / `#0A0A0A` | `#141414` / `#EDEDED` | Cards, tablas, KPIs |
| `--popover` / `--popover-foreground` | `#FFFFFF` / `#0A0A0A` | `#171717` / `#EDEDED` | Menús, popovers, diálogos |
| `--muted` | `#F5F5F5` | `#232323` | Skeletons, pistas de barras, fondos neutros |
| `--muted-foreground` | `#666666` | `#A1A1A1` | Texto secundario (5.74:1 claro, 7.13:1 oscuro sobre card) |
| `--accent` | `#F4F4F4` | `#2A2A2A` | Hover y resaltado de menús (neutro, nunca azul) |
| `--secondary` / `--secondary-foreground` | `#F4F4F4` / `#171717` | `#1F1F1F` / `#EDEDED` | Botón y badge secundarios (neutros) |
| `--border` | `#EBEBEB` | `#262626` | Divisores, bordes |
| `--input` | `#E3E3E3` | `#2E2E2E` | Borde de campos |
| `--ring` | `#0073EA` | `#4C9AFF` | Foco: color pleno (4.53:1 / 6.47:1, supera 3:1 de no-texto); el halo usa `ring-ring/50` |

No existen `--disabled-bg` ni `--disabled-foreground`. Disabled es `opacity-50` uniforme + `pointer-events-none` / `cursor-not-allowed`.

### 2.2 Primario: texto vs relleno

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--primary` | `#0073EA` | `#4C9AFF` | **Texto**, enlaces, bordes, foco, tintes `bg-primary/10` |
| `--primary-solid` | `#0073EA` | `#0073EA` | **Rellenos** bajo `--primary-foreground` (`#FFFFFF`): Button default, Badge default, checkbox/switch marcados, paso activo, barra de Progress |

Relleno sólido = `bg-primary-solid`, nunca `bg-primary`. Límite conocido: `text-primary` sobre su tinte `bg-primary/10` da 3.96:1 en claro; no lo uses para texto pequeño sobre tinte si puedes evitarlo (los variantes `soft` de Button/Badge sí lo hacen; son aceptables por ser etiquetas de acción, no cuerpo de texto).

### 2.3 Semánticos: split texto / relleno

`success`, `warning`, `info` y `destructive` siguen el mismo split que primary:

- **`--x`** es apto para texto: ≥4.5:1 sobre blanco **y** sobre su propio tinte `/10`. Alimenta texto, íconos, bordes y tintes (`text-success`, `bg-success/10`, `border-warning/40`).
- **`--x-solid`** conserva el hex de marca para rellenos sólidos, siempre bajo `--x-foreground`: `bg-success-solid text-success-foreground`.

| Token | `--x` claro | vs blanco / vs tinte 10% | `--x` oscuro | vs card `#141414` / vs tinte | `--x-solid` (ambos temas) | `--x-foreground` |
|---|---|---|---|---|---|---|
| success | `#1D7458` | 5.69 / 4.94 | `#4FBF9F` | 8.15 / 6.97 | `#4FBF9F` | `#0A0A0A` (8.75:1 sobre el solid) |
| warning | `#8A5A00` | 5.93 / 5.16 | `#FBBD5E` | 11.00 / 9.07 | `#FBBD5E` | `#0A0A0A` (11.82:1) |
| info | `#0C6A9C` | 5.90 / 5.11 | `#2EA0DA` | 6.28 / 5.52 | `#2EA0DA` | `#0A0A0A` (6.75:1) |
| destructive | `#C81E1E` | 5.74 / 4.89 | `#F87171` | 6.66 / 5.86 | `#DC2626` | `#FFFFFF` (4.83:1) |

Reglas:

- Nunca `bg-success|warning|info|destructive` (sin `-solid`) con `text-white` ni `text-*-foreground`: la regla `semantic-text-on-solid` lo marca como error. Usa `bg-x-solid`.
- No oscurezcas con `color-mix(in oklch, var(--x), black N%)`: el token ya es legible (`color-mix-darkening`). Excepción vigente: `StatusBadge progress-*` aplica `black 40%` a `--chart-N` (no son semánticos).
- Fondos translúcidos: `bg-x/10` o `/15` + `text-x`, validado en ambos temas.
- `--warning-soft` / `--warning-soft-foreground` son un par de superficie suave para avisos (oklch, con variante oscura).
- `destructive` suave (`bg-destructive/10 text-destructive`) para acciones en línea; sólido (`destructive-solid`) solo para la confirmación final irreversible (§5.1).

### 2.4 Marca

`--brand-primary` `#0073EA`, `-light` `#E0EFFF`, `-dark` `#005CC0`, `-surface` `#EEF6FF`; `--brand-secondary` `#4FBF9F` (`-light` `#E0F5EF`, `-dark` `#2D8A70`); `--brand-accent` `#FBBD5E` (`-light` `#FFF4E0`, `-dark` `#B8862B`); `--brand-error` `#DC2626`; `--brand-info` `#2EA0DA`. Son los hex exactos de `sacdia-app/lib/core/theme/app_colors.dart`, expuestos como `bg-brand-*`. Los `-dark` **no** cumplen AA como texto (4.22:1 y 3.24:1): no los uses para texto; para texto success/warning usa `text-success` / `text-warning`. Prefiere siempre los tokens semánticos.

### 2.5 Gráficos y categorías

| Token | Claro | Oscuro |
|---|---|---|
| `--chart-1` | `#0073EA` | `#4C9AFF` |
| `--chart-2` | `#F06151` | igual |
| `--chart-3` | `#4FBF9F` | igual |
| `--chart-4` | `#FBBD5E` | igual |
| `--chart-5` | `#AE69BA` | igual |

- Los `--chart-*` son para series y para **categorías** (en lugar de un badge de color distinto por categoría). No son texto: sobre fondo claro `--chart-3/4` no cumplen 4.5:1 como texto.
- `--cat-espiritual|competencia|taller|ceremonial|social` (categorías de evento de camporee) y `--section-aventureros|conquistadores|guias` (secciones de club) están definidos en oklch con variante oscura. `--section-guias` es teal, no rojo: el rojo está reservado a error y estado crítico.
- Recharts: colores con `var(--chart-N)`; ejes `tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}`, `axisLine={false}`, `tickLine={false}`; rejilla `className="stroke-border"` discontinua; tooltip `bg-card` con `shadow-lg`. Gradientes de área solo dentro del gráfico (opacidad 0.3 → 0).

### 2.6 Sidebar

| Token | Claro | Oscuro |
|---|---|---|
| `--sidebar` | `#FAFAFA` | `#0A0A0A` |
| `--sidebar-foreground` | `#5C5C5C` (6.41:1) | `#A1A1A1` (7.66:1) |
| `--sidebar-accent` / `-foreground` | `#EDEDED` / `#0A0A0A` | `#1F1F1F` / `#EDEDED` |
| `--sidebar-primary` / `-foreground` | `#0073EA` / `#FFFFFF` | igual |
| `--sidebar-border` | `#EBEBEB` | `#262626` |
| `--sidebar-ring` | `#0073EA` | `#4C9AFF` |

El ítem activo y el hover son grises (`--sidebar-accent`), nunca azul tenue. La etiqueta de grupo usa `text-sidebar-foreground` sin opacidad (contraste AA).

### 2.7 Reglas de uso

```
HACER
  text-muted-foreground          texto auxiliar
  bg-muted                       skeletons, pistas de barras, fondos neutros
  text-success / text-warning    texto y íconos de estado
  bg-x/10 + text-x               tinte de estado (avisos, banners)
  bg-x-solid text-x-foreground   relleno de estado
  bg-primary-solid               relleno de acción
  bg-primary/10 text-primary     SOLO para "seleccionado / actual" (día de hoy, opción elegida, paso hecho)

EVITAR
  bg-blue-50, text-gray-600, bg-white, border-gray-200   paleta Tailwind o blanco fijo
  hex en JSX                      (fugas conocidas: achievements, ui/chart.tsx, rubrics-editor)
  bg-primary/10 como caja decorativa de ícono
```

---

## 3. Tipografía

### 3.1 Fuentes

Cargadas con `next/font/google` en `src/lib/fonts/registry.ts`. `fontVars` va en `<html>` y la clase de la sans en `<body>`. En `@theme inline`, `--font-sans`, `--font-heading` y `--font-display` apuntan a `--font-geist` (nunca `--font-sans: var(--font-sans)`); `--font-mono` a `--font-geist-mono`. Una sola familia: `font-display` es alias de Geist y no hay segunda cara. Cookies de preferencia con caras antiguas caen a Geist vía `parsePreference`.

### 3.2 Escala

Nada por debajo de **11px**. `text-2xs` (`0.6875rem` / 11px, line-height `1rem`) es el token para micro-texto; el único tamaño arbitrario documentado es `text-[13px]`.

| Elemento | Clase |
|---|---|
| Título de página (h1) | `text-2xl font-semibold tracking-tight sm:text-3xl` (vía `PageHeader`) |
| Título de card / sección | `text-base font-medium` (CardTitle, `font-heading`) o `text-base font-semibold` |
| Título de diálogo | `text-base font-medium` (Dialog) / `text-lg font-semibold tracking-tight` (`RouteFormModal`) |
| Texto normal | `text-sm` |
| Texto auxiliar | `text-sm text-muted-foreground` |
| Detalle compacto (línea 2 de fila móvil) | `text-[13px] text-muted-foreground` |
| Etiqueta de campo | `text-sm font-medium` |
| Cabecera de columna | `text-xs font-medium text-muted-foreground` |
| Badge | `text-xs font-medium`; `StatusBadge size="xs"` usa `text-2xs` |
| Micro-texto, contadores | `text-2xs` |
| Cifra KPI | `text-2xl` (`text-3xl` si es la cifra que responde la pantalla), `font-semibold tabular-nums tracking-tight` |
| Código inline | `font-mono text-xs rounded bg-muted px-1.5 py-0.5` |

### 3.3 Reglas

- Pesos: `font-normal`, `font-medium`, `font-semibold`. Sin `font-bold` en títulos nuevos (`h1-font-bold` es error), sin `font-light`/`font-thin`.
- Todo `<h1>` de página pasa por `PageHeader` (`h1-font-semibold` avisa). Excepciones legítimas: login, y heros de detalle que llevan el nombre de la entidad.
- Números: `tabular-nums` siempre en columnas y KPIs; `TableCell` ya lo aplica.
- Sentence case en etiquetas, cabeceras y nombres de sección: nunca `uppercase` + `tracking-*`.
- Tamaños `text-[10|11|12|14px]` sueltos avisan (`off-scale-text`); por debajo de 11px es error (`text-below-11px`). Usa `text-2xs`, `text-xs`, `text-sm`.
- Truncar con `truncate` y un `max-w-*` o `min-w-0` explícito.
- En dispositivos táctiles (`pointer: coarse`) los campos fuerzan 16px para evitar el zoom de iOS (`globals.css`); en escritorio conservan `text-sm`.

---

## 4. Espaciado, radios y layout

### 4.1 Radios por rol

Base `--radius: 0.5rem`; `rounded-lg` = `--radius`. Se elige por rol, no por gusto.

| Rol | Clase | Componentes |
|---|---|---|
| Etiqueta / estado | `rounded-full` | Badge, StatusBadge, Avatar, Switch, Radio, Progress, Slider, dots, Kbd |
| Control | `rounded-lg` | Button, Input, Textarea, Select trigger, NativeSelect, Combobox, Toggle, Tabs list, ítems de Sidebar |
| Ítem dentro de superficie | `rounded-lg` | Ítems de DropdownMenu, Select, Command, ContextMenu |
| Superficie | `rounded-xl` | Card, `DataTableShell`, `KpiStrip`, Popover, menús, Tooltip, banners |
| Overlay | `rounded-2xl` | Dialog, AlertDialog |
| Interno concéntrico | `rounded-md` | Tab trigger, Skeleton, Checkbox |

`Sheet` no lleva radio. `rounded-3xl`/`4xl` están prohibidos (error `pill-radius`).

### 4.2 Estructura de página

```
SidebarProvider (--sidebar-width: calc(var(--spacing) * 68) = 272px)
├── Sidebar
└── SidebarInset
    ├── header h-12 border-b
    ├── <main id="main-content" tabIndex={-1} class="p-4 md:p-6">
    └── {modal}  (slot @modal de rutas interceptadas)
```

Espaciado vertical: `space-y-6` entre bloques de página, `space-y-4` en formularios y listas, `space-y-3` en elementos compactos. Card: `--card-spacing` 24px (`size="sm"`: 16px). Con layout centrado (`data-content-layout=centered`) el contenido tiene `max-w-screen-2xl`.

### 4.3 Grids

| Contexto | Clase |
|---|---|
| Tarjetas de contenido (3 col) | `grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3` |
| Métricas simples | `grid grid-cols-1 gap-3 sm:grid-cols-3` |
| Gráfico + lateral | `grid grid-cols-1 gap-6 lg:grid-cols-3` (`col-span-2` el gráfico) |
| KPIs | `KpiStrip` (§12), no un grid de cards |

### 4.4 Breakpoints

`sm` 640 (grids de 2 col, filas de acciones en línea), `md` 768 (sidebar fijo, **tabla** en lugar de lista de 2 líneas, padding mayor), `lg` 1024, `xl` 1280 (columnas secundarias visibles). Mobile-first: clases base para móvil, prefijos para crecer.

---

## 5. Componentes UI (`src/components/ui`)

### 5.1 Button

| Variante | Uso | Estilo |
|---|---|---|
| `default` | Acción primaria (una por vista) | `bg-primary-solid text-primary-foreground shadow-xs`; hover oscurece 10% |
| `outline` | Secundaria, filtros, cancelar | `border-input bg-background shadow-2xs`; `dark:bg-input/30` |
| `secondary` | Alternativa neutra | `bg-secondary text-secondary-foreground` |
| `ghost` | Íconos, acciones sutiles | hover `bg-muted` |
| `soft` | CTA con color sin llenar | `bg-primary/10 text-primary` |
| `destructive` | Eliminar o desactivar **en línea o en filas** | `bg-destructive/10 text-destructive` (suave) |
| `destructive-solid` | **Confirmación final** de acción irreversible (footer de AlertDialog) | `bg-destructive-solid text-destructive-foreground` |
| `link` | Enlaces en texto | `text-primary underline-offset-4` |

Nunca `className="bg-destructive ..."` a mano.

| Tamaño | Clase |
|---|---|
| `default` | `h-9 px-3` |
| `xs` | `h-6 px-2.5 text-xs` |
| `sm` | `h-8 px-3` |
| `lg` | `h-10 px-4` |
| `icon` / `icon-xs` / `icon-sm` / `icon-lg` | `size-9` / `size-6` / `size-8` / `size-10` |

Comportamiento común:

- Foco: `focus-visible:border-ring ring-[3px] ring-ring/50`. Inválido: `aria-invalid:border-destructive ring-destructive/20`.
- **Press**: `PRESS_SCALE_CLASSES` (`active:not-aria-[haspopup]:scale-[0.97]`), con `motion-reduce:active:scale-100`. Solo los botones; los triggers que abren menú (`aria-haspopup`) y los campos no escalan.
- Transición: propiedades nombradas, 150ms, `--ease-out-expo`.
- **Carga**: `<Button loading={pending}>` deshabilita, pone `aria-busy`, cambia el ícono propio por un spinner sin atenuar. Nunca `{pending && <Loader2/>}` dentro de un Button. `AlertDialogAction` acepta la misma prop. `FormSubmitButton` (`shared`) lo conecta a `useFormStatus`; no marques pending en `onClick` (deshabilita antes del submit y la acción no corre).
- Ícono + texto: ícono 16px (`size-4` por defecto), sin `mr-*`; el gap lo pone el botón.

### 5.2 Badge

`h-5 rounded-full px-2 text-xs font-medium`. Variantes: `default` (`bg-primary-solid`), `secondary`, `destructive` (tinte), `success` (`bg-success-solid text-success-foreground`), `warning` (`bg-warning-solid`), `outline`, `ghost`, `link`, y los tintados `soft`, `soft-info`, `soft-success`, `soft-warning`, `soft-destructive` (`bg-x/10 text-x border-x/20`).

Uso: `Badge` es para etiquetas estáticas (conteos, "Nuevo", "Solo lectura"). **No** uses `Badge default`/`soft` (azul) para estados. Los estados de dominio van por `StatusBadge` (§5.3).

### 5.3 StatusBadge (`ui/status-badge.tsx`)

Marca de estado unificada. Props: `intent`, `label`, `icon?` (`null` quita el ícono por defecto), `size?` (`xs` | `sm` | `default`), `className?`.

| Intent | Apariencia | Ícono por defecto | Uso |
|---|---|---|---|
| `neutral` | pill neutro, texto muted | `MinusCircle` | Inactivo, borrador, sin enviar |
| `info` | pill neutro, ícono `text-info` | `Info` | Enviado, en cola |
| `success` | pill neutro, ícono `text-success` | `CheckCircle2` | Aprobado, validado, activo |
| `warning` | pill neutro, ícono `text-warning` | `AlertTriangle` | Pendiente, requiere atención |
| `destructive` | tinte rojo (Badge `destructive`) | `XCircle` | Rechazado, fallo |
| `primary` | relleno `bg-primary-solid` | `Circle` | Estado final positivo (investido) |
| `progress-1/2/3` | tinte `--chart-1/2/3` | — | Etapas ordenadas de un pipeline |

El color vive solo en el ícono (nunca depende solo del color: WCAG 1.4.1). Los wrappers de dominio (`investiture-status-badge`, `evidence-status-badge`…) mapean enums del backend a `{ label, intent }` y son los únicos que conocen esos enums; `StatusBadge` no sabe qué es `SUBMITTED`.

Booleanos (activo/inactivo, habilitado, completado): `<StatusBadge intent={flagStatusIntent(value)} />` (`src/lib/status/flag-status.ts`: `true` → `success`, `false` → `neutral`).

**Una marca de estado por fila.** Muestra la excepción o el estado inactivo; no pongas "Activo" en cada fila de una lista donde casi todo está activo. Si todas las filas comparten el estado, es columna redundante.

### 5.4 Card

`rounded-xl border-transparent bg-card shadow-card`, `gap` y `py` = `--card-spacing` (24px; `size="sm"` 16px). Partes: `CardHeader` (grid, admite `CardAction`), `CardTitle` (`font-heading text-base font-medium`), `CardDescription`, `CardContent`, `CardFooter`. `shadow-card` ya trae el anillo hairline: no añadas `border` ni `ring`. No pongas `transition-all` ni hover decorativo; `--shadow-card-hover` existe para cards que son enlaces. No anides una Card en otra Card.

### 5.5 Table

Primitivo de `ui/table.tsx`:

- `Table` envuelve `<table>` en un contenedor con scroll horizontal y **desvanecido de borde** (`useEdgeFade`, atributos `data-overflow-start|end`). El marco redondeado lo pone `DataTableShell` (§10).
- `TableHead`: `h-12 px-3 font-medium whitespace-nowrap`. Las cabeceras de columna del panel son **12px, muted y sin fondo** (`text-xs font-medium text-muted-foreground`, también con `SortableHeader`); no hay banda de color.
- `TableCell`: `p-3 align-middle whitespace-nowrap tabular-nums`. Textos largos: `whitespace-normal max-w-*`.
- `TableRow`: `border-b`, hover `bg-muted/50`, seleccionada `bg-muted`.
- Columna de acciones pegada a la derecha (CSS en `globals.css` sobre `data-slot="row-actions"`, `RowActionsHead`); con ella el fade se reemplaza por una sombra hairline como señal de overflow.
- Columnas secundarias se ocultan con `hidden lg:table-cell` / `hidden xl:table-cell` para caber a ~1200px con sidebar abierto. En TanStack, la clase va en `meta: { className }` de la columna (tipado en `src/types/tanstack-table.d.ts`) y la página la aplica a `TableHead` y `TableCell`.
- Números y montos: alineados a la derecha con `tabular-nums`.

Patrón completo de listado: §11.

### 5.6 Campos

| Componente | Notas |
|---|---|
| `Input` | `h-9 rounded-lg border-input bg-background shadow-2xs`, `dark:bg-input/30`; foco `ring-[3px] ring-ring/50`; `text-base md:text-sm` |
| `Textarea` | Igual que Input; `min-h-16`, `field-sizing-content`, `resize-none` (usa `resize-y` si debe crecer) |
| `Select` | Trigger igual que Input (`h-9`); en formularios de página `className="w-full"`; no escala al presionar |
| `NativeSelect`, `InputGroup`, `Combobox` | Mismo fondo y sombra que Input |
| `Label` | `text-sm font-medium`; obligatorio: `<span className="ml-0.5 text-destructive">*</span>` |
| `Checkbox` | `size-4 rounded-md`; marcado `bg-primary-solid`; área táctil ampliada con `after:-inset-*` |
| `Switch` | `default` 32×18px, `sm` 24×14px; marcado `bg-primary-solid`; área táctil ampliada |
| `RadioGroup`, `Slider`, `InputOTP`, `Calendar`, `Command` | Mismas reglas de foco y tokens |

Icono a la izquierda en un Input: `relative` + ícono `pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground` + `pl-8`.

### 5.7 Navegación y contenedores

| Componente | Notas |
|---|---|
| `Tabs` | `default`: lista `bg-muted p-[3px] h-9 rounded-lg`, activo `bg-background`. `line`: sin fondo, subrayado `after:bg-foreground` 2px bajo el activo. Admite `orientation="vertical"`. |
| `Progress` | Pista `h-3 bg-muted rounded-full`, relleno `bg-primary-solid`. Para barras con umbral usa las del `KpiStrip` (§12). |
| `Avatar` | `sm` 24px, `default` 32px, `lg` 40px; fallback `bg-muted text-muted-foreground`. `AvatarGroup` para apilados. |
| `Skeleton` | `animate-pulse rounded-md bg-muted motion-reduce:animate-none`. Dimensiones que imiten el contenido real. |
| `Separator` | Usa `orientation="vertical"` (Radix lo soporta) o `h-6 w-px`. |
| `Tooltip` | `bg-foreground text-background rounded-xl text-xs`. `TooltipProvider` global con `delayDuration` y `skipDelayDuration` de 300ms; solo anima en `delayed-open`, `instant-open` sin animación. |
| `Collapsible` / Accordion | Sin animación de altura (fade 150ms como máximo). |
| `Alert` | `default` (`bg-card`) y `destructive` (texto rojo). Para avisos en formularios; con ícono. |
| `Spinner` | Para spinners fuera de botones. `animate-spin motion-reduce:animate-none`. |
| `Empty` (shadcn) | Eliminado: usa `EmptyState` (§10). |

---

## 6. Iconos

- **Hugeicons** es la librería de producto. Los primitivos nuevos importan Hugeicons directo (`HugeiconsIcon` + `@hugeicons/core-free-icons`, p. ej. Dialog/Sheet close, Sonner, Spinner).
- Los imports de `lucide-react` **no usan Lucide**: `tsconfig.json` y `next.config.ts` los redirigen a `src/lib/icons/lucide-react-compat.tsx` (glifos Hugeicons con API Lucide). Es la vía normal en código de pantallas y compartidos. Si falta un ícono, `pnpm icons:generate` regenera el compat. No añadas otra librería de iconos.
- Los íconos son decorativos salvo que sean el único contenido del control: `aria-hidden="true"` en decorativos; el botón de solo ícono lleva `aria-label`.

| Contexto | Tamaño |
|---|---|
| Sidebar y botones con texto | 16px (`size-4`) |
| Submenús, filas de tabla, indicadores inline | 14px (`size-3.5`) |
| Dentro de badges | 12px (`size-3`) |
| `EmptyState` | 24px (`size-6`) |
| Hero / login | `size-8` |

Icono por acción: Crear `Plus`, Editar `Pencil`, Desactivar `Ban`, Eliminar `Trash2`, Buscar `Search`, Menú de fila `MoreHorizontal`, Cerrar `X`, Alerta `AlertTriangle`, Éxito `Check`/`CheckCircle2`, Enlace externo `ArrowUpRight`.

Contenedores: los íconos van sueltos. No hay "icon tiles" decorativos (§0). Excepciones: el círculo de `EmptyState` y `AlertDialogMedia` (`bg-muted`), que son parte del componente.

---

## 7. Motion

Fuente: `src/lib/animations.ts` + variables de `globals.css`. No copies duraciones ni curvas sueltas.

### 7.1 Tokens

| Token | Valor | Uso |
|---|---|---|
| `--ease-out-expo` (`EASE_OUT_EXPO`) | `cubic-bezier(0.23, 1, 0.32, 1)` | **La** curva de entrada y de transiciones de UI |
| `--ease-in-out-expo` | `cubic-bezier(0.77, 0, 0.175, 1)` | Reservada; no la uses sin motivo |
| `--ease-drawer` (`EASE_DRAWER`) | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheet, bottom sheet de formularios y sidebar |
| `--duration-fast` | 150ms | Press, hover, tooltip, salida de overlays |
| `--duration-normal` | 200ms | Entrada de overlays, salida de Sheet, sidebar |
| `--duration-slow` | 250ms | Entrada de login (no dashboard) |
| `--duration-sheet` | 300ms | Entrada de Sheet |

### 7.2 Constantes y helpers

| Export | Valor / uso |
|---|---|
| `PRESS_SCALE` | `"0.97"`; `PRESS_SCALE_CLASSES` es el literal para Tailwind. **Solo botones.** |
| `SURFACE_MOTION_CLASSES` | `duration-200 data-closed:duration-150`, `motion-reduce:animate-none`, `--ease-out-expo`. En todo overlay (Dialog, AlertDialog, Popover, Dropdown, Select…) |
| `EMPTY_STATE_ENTER_CLASSES` | Fade 200ms, sin zoom. Lo aplica `EmptyState` |
| `PAGE_ENTER_CLASSES` | Fade + 8px, 250ms. **Solo auth** (login, verificar correo, restablecer) |
| `STAGGER_CLASSES` / `getStaggerStyle` | Superficies raras de primera vez. Nunca en tablas, listas, KPIs ni `loading.tsx` |

### 7.3 Reglas

- Una sola curva de entrada (`--ease-out-expo`). Nunca `ease-in`, nunca `scale(0)` (arranca en `0.95` + opacidad).
- Transiciones con **propiedades nombradas**; prohibido `transition-all`.
- **Press** `scale(0.97)` solo en `Button` (`PRESS_SCALE_CLASSES`). Select, inputs, badges, filas y cards no escalan.
- **Overlays**: entrada 200ms, salida 150ms (`SURFACE_MOTION_CLASSES`). Modales centrados (zoom desde 95%). Popover, Dropdown, Select, Tooltip y HoverCard usan `origin-(--radix-*-content-transform-origin)`: nacen del trigger.
- **Sheet**: entra 300ms, sale 200ms, con `--ease-drawer`. El bottom sheet de formularios en móvil usa la misma curva.
- **Sin animación** en acciones frecuentes o de teclado: `⌘B` del sidebar (clase `instant-motion` en `html` durante el toggle), la paleta de comandos (`overlayInstant`, `animate-none`), `Collapsible` y chevrons de navegación (≤100ms), abrir tooltips con `skipDelay`.
- **Sidebar**: ancho y posición con `duration-200` y `--ease-drawer` (no lineal). El click de puntero conserva la transición.
- **Navegación del dashboard**: sin `PAGE_ENTER_CLASSES`; el layout no anima el contenido. Tablas, listas operativas y `loading.tsx` montan instantáneos.
- Hover con transform: solo bajo `[@media(hover:hover)_and_(pointer:fine)]:`; los cambios de color pueden quedar sin gate.
- **Reduced motion**: `motion-reduce:` quita spin, pulse, slide y zoom (color y opacidad pueden quedarse). `globals.css` apaga `animate-spin`, `animate-pulse` y la animación de los toasts. `.disable-transitions` y `.instant-motion` anulan transiciones.
- Nada de movimiento perpetuo sin propósito (`animate-ping`, orbes flotantes).

---

## 8. Superficies y overlays

### 8.1 Elevación

| Token | Uso |
|---|---|
| `--shadow-card` | `Card`, `DataTableShell`, `KpiStrip`, marco de `FormPageFrame`. Anillo hairline 1px + contacto suave |
| `--shadow-card-hover` | Card que es enlace |
| `--shadow-2xs`, `--shadow-xs` | Campos y botones (profundidad mínima) |
| `--shadow-sm` … `--shadow-2xl` | Todos incluyen el anillo hairline (en oscuro blanco al 8%) |

**Superficie flotante** (Dropdown, Popover, Select, ContextMenu, Menubar, Combobox, Tooltip de gráficos) = `shadow-lg` sola. El token ya incluye el anillo: no sumes `ring-1` ni `border`, ni `shadow-xl/2xl` (doble anillo y blur excesivo). El Dialog es una superficie modal: `rounded-2xl`, `ring-1 ring-foreground/5` y `shadow-2xl`.

### 8.2 Overlay único

`Dialog`, `AlertDialog`, `Sheet` y `Drawer` comparten el mismo overlay: `fixed inset-0 z-50 bg-black/40 dark:bg-black/60`, fade, **sin blur**. Salida 150ms (`data-closed:duration-150`). Si añades un overlay nuevo, copia ese.

### 8.3 Elegir la superficie

| Situación | Superficie |
|---|---|
| Crear / editar entidad con CRUD propio | Modal de ruta interceptada (§14.1) |
| Catálogo simple de 1-4 campos | `Dialog` (excepción, §15) |
| Acción puntual con parámetros, o log / historial de solo lectura | `Dialog` |
| Acción compuesta sobre un listado (más de 4 campos, variantes) | `Sheet` compose (§14.3) |
| Confirmar eliminación o desactivación | `AlertDialog` (§14.2) |
| Menú de acciones de fila | `DropdownMenu` vía `RowActions` (§11.5) |

---

## 9. Layout y navegación

### 9.1 Shell (`src/app/(dashboard)/layout.tsx`)

- **Skip link** (primer hijo del provider): `<a href="#main-content">` visible solo con foco, texto i18n `nav.a11y.skipToContent`.
- **Landmarks**: `<header>` (h-12), sidebar como `nav`, `<main id="main-content" tabIndex={-1}>`. Todo el contenido de página va dentro de `main`; el `h1` es único por pantalla.
- `main`: `p-4 md:p-6`; `has-data-[content-padding=false]` quita el padding (pantallas a sangre).
- El header contiene `SidebarTrigger`, `SearchDialog` (izquierda) y `ThemeSwitcher` + `HeaderUserMenu` (derecha). Con `data-navbar-style=sticky` es `sticky top-0` con `bg-background/50 backdrop-blur-md` (única excepción de blur: la barra superior pegajosa).
- Gates en el layout: territorio sin configurar (`TerritoryUnconfigured`), sin acceso a la ruta (`PageAccessForbidden`). El slot `modal` solo se monta si hay acceso. Las páginas de `@modal/(.)dashboard/**` se protegen solas con `canCapability` (el layout no se re-renderiza en navegación suave).

### 9.2 Sidebar

- Ancho 272px (`--sidebar-width`), `Sheet` en móvil (`< md`), modo ícono colapsable.
- **Alcance bajo la marca**: el nombre del territorio del actor (`insights.scopeName`) se muestra como segunda línea `text-xs text-muted-foreground` bajo el nombre de la app.
- **Contadores de colas**: `QueueCount` (`text-xs tabular-nums`, con texto `sr-only` "pendientes") en las colas de acción: `requests-assignments`, `requests-transfers`, `validations-investitures` (validaciones + honores) y `annual-folders-evaluate`. Solo valores > 0. Los datos salen de `loadSidebarInsights()` (`src/lib/dashboard/sidebar-insights.ts`): no se espera en el layout (la promesa se resuelve en el cliente), nunca rechaza (devuelve vacío ante error) y el backend la cachea 60s. El sidebar es decoración: nunca rompe el layout.
- **Un solo ítem activo**: gana la coincidencia más específica. `getBestMatchLength` calcula la URL más larga que coincide y `isLeafActive` marca solo esa. Los modos de `activeMatch` son `exact` (por defecto), `prefix`, `clubs-list` y `evidence-folders` (`src/navigation/sidebar/nav-match.ts`). Añade `activeMatch` al ítem cuando una ruta hija no deba activar al padre.
- Etiquetas de grupo `text-xs font-medium text-sidebar-foreground`, sin opacidad. Submenús: `Collapsible` instantáneo con borde `border-l border-border/60`. Activo y hover: `bg-sidebar-accent`.
- Filtrado por permisos: `src/navigation/sidebar/filter-sidebar.ts`; items en `sidebar-items.ts`.

### 9.3 Breadcrumbs y encabezados

- `PageHeader` renderiza los breadcrumbs (`<nav aria-label>` i18n, chevron, último sin enlace). Páginas de detalle: `PageHeader` solo con breadcrumbs y el hero lleva el `h1`. Sin botón "Volver" si hay breadcrumb.

---

## 10. Componentes compartidos (`src/components/shared`)

| Componente | Responsabilidad |
|---|---|
| `PageHeader` | `title?`, `description?`, `breadcrumbs?`, `actions?` (o `children`). h1 `text-2xl sm:text-3xl font-semibold tracking-tight`, descripción `max-w-prose text-sm text-muted-foreground`. Acciones a la derecha desde `sm`, debajo en móvil |
| `EmptyState` | `icon`, `title`, `description?`, `children?` (acción), `variant` `default` \| `no-results`. Marco `border-dashed rounded-lg p-8`; círculo `size-12` (`bg-muted` / `bg-muted/40`); título `text-lg font-semibold`; fade 200ms. Es el **único** lugar donde se permite `border-dashed` (`dashed-empty-state`) |
| `ListPageSkeleton({ rows = 8, filters = 3 })` | Espejo de una página de listado: encabezado, fila de filtros y `DataTableShell` con filas de 48px. Server component async, `aria-busy`, `role="status"` oculto |
| `DetailPageSkeleton` | Espejo de un detalle: encabezado, barra de pestañas, 3 tarjetas y un bloque |
| `DataTableShell` | Marco de tabla: `overflow-hidden rounded-xl border-transparent bg-card shadow-card`. El scroll vive en `<Table>` |
| `DataTablePagination` | Pie de paginación, dos modos (§11.3) |
| `RowActions` / `RowActionsHead` | Menú "⋯" de fila (§11.5) |
| `SortableHeader` | Cabecera ordenable (`text-xs font-medium text-muted-foreground`, `aria-label` i18n "Ordenar por…") |
| `KpiStrip` / `KpiStripItem` | KPIs en un contenedor dividido (§12) |
| `EndpointErrorBanner` | Error dentro del bloque que falló (§13.2) |
| `RefreshButton` | Reintento para páginas de servidor: `router.refresh()` con `loading` |
| `ListFilterField` | `Label` + control con `id` enlazado y ancho `w-[200px]` (`w-full` en móvil) |
| `ListFiltersShell` | Caja de filtros con fondo `bg-muted/20` y título. Legado en 4 pantallas; no la uses en pantallas nuevas |
| `RouteFormModal`, `FormPageFrame`, `FormModalSteps/Body/Footer`, `useFormModal`, `useFormSteps` | Formularios de crear/editar (§14.1) |
| `FormSubmitButton` | Submit con `useFormStatus` |
| `PageAccessForbidden`, `TerritoryUnconfigured`, `PrerequisiteNotice` | Estados de acceso y prerequisitos |
| `CatalogThumbnail`, `LocationPicker`, `PdfInlineViewer`, `selectors/*` | Utilidades de dominio compartidas |

`LoadingSkeleton`, `ConfirmDialog`, `DataTable` genérico y `ModuleListPage` **no existen**. Las confirmaciones usan `AlertDialog` directo (§14.2).

`Toaster` está montado en `src/app/layout.tsx`: `<Toaster position="top-center" closeButton />`.

---

## 11. Patrón de listado

Todo listado de entidades sigue la misma estructura.

```
PageHeader (título, descripción, acción primaria "Nuevo…")
Filtros / búsqueda (cada control con etiqueta o aria-label)
├─ (md+)  DataTableShell > Table
├─ (<md)  lista de filas de 2 líneas
├─ vacío  EmptyState FUERA de la tabla
└─ DataTablePagination
```

### 11.1 Tabla (md+) y lista de 2 líneas (<md)

- Desde `md`, `DataTableShell` + `Table`. Por debajo de `md`, filas de 2 líneas (`ul`, `border-b py-3`), no una tabla con scroll lateral: línea 1 = identidad (nombre, a la izquierda) + marca de estado/valor clave (derecha); línea 2 = detalles `text-[13px] text-muted-foreground tabular-nums` separados por `gap-x-3`; acciones a la derecha. Referencia: `CatalogTableView` (`mobileTitleIds` define qué columnas son identidad; ids reservados `search`, `actions`, `active`).
- Cabeceras 12px, muted, sin banda; sin `uppercase`.
- Números y montos alineados a la derecha, `tabular-nums`. El signo del monto lleva el significado (+ / −); no dependas solo del color.
- El nombre de la fila enlaza al detalle (acción principal); el resto va en "⋯".
- Una marca de estado por fila (§5.3): muestra lo inactivo o excepcional.
- Sin hover-reveal de acciones, sin stagger.

### 11.2 Vacío y sin resultados

`EmptyState` **fuera** de la tabla: no pintes una tabla vacía con una fila de texto. Dos casos distintos:

- Sin datos: `variant="default"`, título claro, acción opcional ("Crear…").
- Filtro sin coincidencias: `variant="no-results"`, descripción con la entidad. En `CatalogTableView`, `isFiltered` decide cuál.

### 11.3 Paginación (`DataTablePagination`)

Props: `page` (1-based), `totalPages`, `total`, `limit`, `limitOptions?` (por defecto `[20, 50, 100]`; los catálogos usan `[10, 20, 50, 100]`), y opcionalmente `onPageChange` / `onPageSizeChange`.

| Modo | Cuándo | Comportamiento |
|---|---|---|
| **URL** (sin `onPageChange`) | Listados paginados en servidor | Escribe `?page=&limit=` con `router.push`; cambiar el tamaño vuelve a la página 1 |
| **Controlado** (con `onPageChange`) | Tablas TanStack en cliente | No toca el router; el llamador navega y resetea a página 1 al cambiar el tamaño |

Todo el texto sale de `shared.pagination` (`showing`, `perPage`, `pageOf`, `prevPage`, `nextPage`). No escribas "Anterior/Siguiente" a mano (`hardcoded-pagination`).

### 11.4 Filtros y búsqueda

- **Cada filtro o búsqueda tiene `Label` visible o `aria-label`.** Un placeholder no es etiqueta.
- Los filtros se ajustan con `flex-wrap` y ocupan ancho completo en móvil; nunca scroll horizontal.
- Si el filtro es de servidor y la API no lo soporta aún, dilo en la UI ("Filtrando solo esta página") en lugar de fingir.
- Estado vacío tras filtrar: ofrece "Limpiar filtros".
- `CatalogFilterBar` (búsqueda + estado + chips) es el filtro estándar de catálogos.

### 11.5 Acciones de fila (`RowActions`)

Un único patrón en todas las tablas: `RowActions` + `RowActionsHead` (`shared/row-actions.tsx`). Prohibidos: íconos sueltos (ojo/lápiz/papelera), botones de texto sueltos en la celda y acciones que solo aparecen con hover. Los controles de datos en línea (Switch, input) no son acciones y se quedan en su celda.

```tsx
<RowActions
  label={item.name}                       // "Acciones de {name}" para lectores de pantalla
  actions={[
    { label: t("edit"), icon: Pencil, href: `${base}/${item.id}/edit` },
    { label: t("history"), icon: History, onSelect: openHistory },
    { label: t("delete"), icon: Trash2, destructive: true, hidden: !canDelete, onSelect: askDelete },
  ]}
/>
```

| Patrón | Dónde | Composición |
|---|---|---|
| **A · CRUD** | Listados de entidades | Solo "⋯". Acciones normales primero; las destructivas al final, tras separador y en rojo. Etiqueta con "…" cuando sigue una confirmación ("Eliminar…") |
| **B · Colas de revisión** | Validaciones, solicitudes | Hasta 2 botones de decisión en `primary` (negativo `outline`, positivo `default`) + "⋯" para el resto. Ancha la `RowActionsHead` con `className` |

Acción: `label`, `icon?`, `href?` (tiene prioridad sobre `onSelect`), `external?` (nueva pestaña), `onSelect?`, `destructive?`, `disabled?`, `hidden?`. Condiciones con `hidden`, no armando el arreglo condicional. El menú es `modal={false}` para que un `AlertDialog` abierto desde un ítem no herede un body bloqueado. Si no hay acciones visibles ni `primary`, no renderiza nada.

---

## 12. KPIs y presentación de datos

### 12.1 KpiStrip

KPIs como tipografía, no como tarjetas. `KpiStrip` es **un** contenedor (`rounded-xl bg-card shadow-card`, hairlines `border-border` entre celdas) con columnas iguales; en móvil son 2 columnas (una celda impar final ocupa ambas), desde `sm` una fila. `role="list"` con `aria-label`.

```tsx
<KpiStrip aria-label={t("summary")}>
  <KpiStripItem label="Pendientes" value={12} emphasis />
  <KpiStripItem label="Asistencia" value="86" unit="%" meter={{ value: 86 }} />
  <KpiStripItem label="Saldo" value="+$4,200" subline="vs. mes anterior" href="/dashboard/finances" />
</KpiStrip>
```

`KpiStripItem`: `label`, `value`, `unit?` (muted tras la cifra), `subline?`, `emphasis?` (la cifra que responde la pregunta de la pantalla: `text-3xl`), `meter?: { value: 0-100 | null, tone? }`, `valueClassName?`, `href?` (toda la celda es enlace con foco visible), `data-kpi?`.

Reglas:

- **Sin tiles de ícono, sin sparklines, sin tendencias decorativas.** Solo etiqueta, cifra y, si aporta, una línea de contexto.
- **Medidores neutros** (`bg-foreground/70`, pista `bg-muted`, `h-1`). `warning` o `destructive` solo cuando se cruza un umbral real, nunca como decoración.
- Una cifra destacada por franja (`emphasis`).
- El significado de un monto va en el signo y la etiqueta; el color de `valueClassName` solo refuerza.
- Usado en: dashboard de operaciones, finanzas, seguro, resumen de eventos y estadísticas de usuario.

### 12.2 Barras y progreso

`Progress` de `ui` para progreso simple. Barras a medida: pista `h-1`-`h-2 rounded-full bg-muted`, relleno neutro; `transition-[width]` si se anima (nunca `transition-all`). Color de alerta solo bajo un umbral.

### 12.3 Timeline y pasos

Línea vertical `w-px bg-border` con puntos; el estado actual puede usar `bg-primary/10 text-primary` (excepción "seleccionado/actual"). Etiquetas de fase en `text-2xs` o `text-xs`, nunca `text-[10px]`.

### 12.4 Gráficos

Ver §2.5. Un gráfico por pregunta; sin leyendas redundantes si hay etiquetas directas; colores de `--chart-*`.

---

## 13. Estados: carga, error, vacío

### 13.1 Carga

- Cada ruta pesada tiene `loading.tsx` con `ListPageSkeleton` (listados) o `DetailPageSkeleton` (detalles), que **imitan el layout real**: ajusta `rows` y `filters` a la pantalla. Si la pantalla no coincide con ninguno, compón con `Skeleton` y `DataTableShell`.
- Sin stagger ni entrada animada en `loading.tsx`.
- En botones: `loading` (§5.1). Fuera de botones: `Spinner`.

### 13.2 Errores dentro del bloque que falló

- Un fallo de carga **no se traga como vacío**. Si el fetch falla, muestra `EndpointErrorBanner` en el lugar del bloque, con reintento; nunca `EmptyState` ni una tabla vacía.
- `EndpointErrorBanner`: `state` `forbidden` (ícono `ShieldOff`, tono destructivo) \| `missing` (`ServerOff`, destructivo) \| `rate-limited` (`Clock`, warning), `detail`, `showLoginLink?`, `onRetry?` + `retrying?` (clientes que re-ejecutan el fetch), `action?` (nodo libre, p. ej. `<RefreshButton />` desde una página de servidor). `role="alert"`; título corto del estado + detalle debajo; el tono vive en el ícono y en un tinte tenue (`border-destructive/25 bg-destructive/5` o `border-warning/40 bg-warning/10`); sin badge.
- Si un bloque falla pero el resto de la pantalla sirve, solo ese bloque muestra el error.

### 13.3 Límite de ruta

`src/app/(dashboard)/error.tsx` captura lo no controlado: `role="alert"`, `h1` "Algo salió mal" (i18n `shared.routeError`), **Reintentar** (`reset`) e **Ir al inicio**, y reporta a Sentry. Se renderiza dentro del shell (sidebar y header siguen vivos).

### 13.4 Error global

`src/app/global-error.tsx` reemplaza el layout raíz: sin providers, fuentes ni CSS de la app. Por eso usa estilos en línea y texto en español fijo; es la **única excepción** a "sin español en JSX fuera de i18n" y a "sin estilos inline".

### 13.5 Vacío

`EmptyState` (§10, §11.2). Copy: título breve ("Sin registros") + descripción útil + acción solo si el usuario puede actuar.

### 13.6 Errores de formulario

Error de campo: `text-destructive text-xs` bajo el control. Error general: `Alert variant="destructive"` o banner `rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive`. Los `fieldErrors` del servidor regresan al paso del formulario que los contiene.

---

## 14. Patrones de CRUD

### 14.1 Crear / Editar: modal sobre el listado (rutas interceptadas)

Crear y editar abren un **modal sobre el listado** con *intercepting routes* de Next.js. La URL (`/new`, `/[id]/edit`) se conserva: se comparte, y Back cierra el modal. La carga directa o recarga también abre el modal, con el listado debajo.

Piezas (`src/components/shared/form-modal.tsx`):

| Pieza | Uso |
|---|---|
| `RouteFormModal` | Dialog del formulario. Al cerrar espera 150ms de animación y luego `router.back()`, o `router.replace(dismissHref)` en carga directa. Enfoca el diálogo, no la X ni el primer campo (evita ring de error y teclado móvil). En móvil (`max-sm`) es una **hoja inferior** (`92dvh`, ancho completo, sube con `--ease-drawer`) |
| `FormModalSteps` | Tira de pasos numerados; solo etiquetas, la navegación vive en el footer. Activo `bg-primary-solid`; hecho `bg-primary/10 text-primary` con check |
| `FormModalBody` | Cuerpo con scroll y `overscroll-contain`; `stepKey` + `direction` animan el cambio de paso (fade + 8px; solo fade con reduced motion) |
| `FormModalFooter` | "Paso X de Y" a la izquierda, acciones a la derecha, respeta `safe-area-inset-bottom` |
| `useFormModal(listHref)` | `close()` en Cancelar, `complete()` al guardar (cierra y refresca). Funciona igual en modal y en página |
| `useFormSteps(total)` | Estado de pasos |
| `FormPageFrame` | **Fallback de página completa**: cabecera con "Volver" + card del formulario. Se usa en la carga directa de rutas cuyo listado de debajo es pesado y no aporta (formularios de eventos de camporee local y de unión, plantillas de evento) |

Estructura de rutas (slot `@modal` en `src/app/(dashboard)/`):

```
(dashboard)/
├── layout.tsx                          recibe { children, modal }
├── @modal/default.tsx                  null
├── @modal/[...catchAll]/page.tsx       null (limpia el slot)
├── @modal/(.)dashboard/users/new/page.tsx   RouteFormModal + formulario
└── dashboard/users/new/page.tsx             listado debajo + RouteFormModal dismissHref
```

La carga de datos va en un loader compartido (`src/lib/<dominio>/*-form-data.ts`) que usan ambas rutas; devuelve `null` si el actor no tiene permiso.

**Pasos**: formularios con más de ~6 campos o grupos claros se dividen en pasos (máx. 3-4). "Continuar" valida solo el paso actual; Enter en un paso intermedio avanza. Con server actions todos los pasos quedan montados (`hidden`) para que el `FormData` lleve todo. Componentes pesados (mapa) se montan al visitar su paso.

Referencias: `users/new` (react-hook-form, 2 pasos), `clubs/new` (server action + mapa, 3 pasos).

### 14.2 Eliminar / desactivar: AlertDialog

Siempre `AlertDialog` con confirmación; nunca `window.confirm`.

```tsx
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>¿Desactivar “{name}”?</AlertDialogTitle>
      <AlertDialogDescription>El registro deja de estar disponible; no se elimina.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
      <AlertDialogAction variant="destructive-solid" loading={loading} onClick={confirm}>
        Desactivar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- `size="default"` (`max-w-xs`, `sm:max-w-md`) o `size="sm"` (`max-w-xs`).
- Confirmación final irreversible = `destructive-solid`; el disparador en la fila es `RowActions` con `destructive: true`.
- Título como pregunta; la descripción dice qué pasa. `AlertDialogMedia` (círculo `bg-muted`) es opcional.
- Textos de botón en infinitivo ("Desactivar", "Eliminar"); estado de carga con `loading`, no cambiando el texto a mano.

### 14.3 Sheet compose (acciones sobre un listado)

Úsalo cuando se cumplan **todos**: la operación es secundaria respecto al listado, no hay pantalla de edición posterior (enviar, disparar, registrar), mantener el listado visible tras el submit es lo esperado, y el formulario no cabe cómodo en un Dialog (más de 4 campos, selects encadenados, variantes). Referencia: `notifications/notification-compose-sheet.tsx`.

```
SheetHeader (border-b, px-6 py-5)    título + SheetDescription contextual
Selector de tipo (opcional)           radiogroup/cards si hay 2+ variantes
Body (flex-1 overflow-y-auto px-6)    FieldSet + FieldLegend variant="label"
Footer sticky (border-t, pt-4)        submit w-full + hint opcional
```

- Disparador en `PageHeader.actions` (botón primario con `Plus`).
- `SheetContent`: `flex h-full flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-md`.
- Al éxito: cerrar, `router.refresh()`, limpiar query params (`?compose=1&type=…`).
- i18n: chrome en `configuration.<feature>.compose.*`.

### 14.4 Flujo

Listado → "Nuevo…" abre el modal de `/new` → guardar: acción, `toast.success`, cierra y refresca. Fila → "⋯" → Editar abre `/[id]/edit`; Eliminar abre `AlertDialog`; al confirmar, `toast.success` y refresco. Textos de toast en §20.

---

## 15. Catálogos

Existen **tres orquestadores** de catálogo. Comparten los primitivos de listado (§11) y esta decisión está tomada: **no se fusionan en PhaseE**.

| Orquestador | Páginas | Dónde |
|---|---|---|
| `PhaseECatalogCrudPage` (`catalogs/phase-e-catalog-crud-page.tsx`) | 12 | Catálogos genéricos con fetch cliente y toasts con título + descripción |
| `*PageClient` + `CatalogTableView` | 10 | countries, divisions, unions, districts, churches, club-types, club-ideals, honor-categories, honors, local-fields. Tabla TanStack con filtros propios, paginación controlada y lista de 2 líneas en móvil |
| `CatalogEntityPage` → `CatalogCrudPage` | 1 | `ecclesiastical-years`. Server component: auth, `listEntityItems`, `EndpointErrorBanner` si falla, `selectOptions`; la config sale de `lib/catalogs/entities.ts` |

Reglas comunes:

- Cabeceras, filas móviles, `EmptyState`, `DataTablePagination` y `RowActions` son los de §11; no reimplementes paginación ni vacíos.
- **Crear/editar con `Dialog` (`CatalogFormDialog`) es una excepción aceptada para catálogos simples** (1-4 campos, sub-entidad sin ciclo de vida propio). Cualquier otro CRUD usa la ruta interceptada de §14.1 (con `FormPageFrame` de fallback donde aplique).
- Desactivar con `CatalogDeleteDialog` (AlertDialog).
- `club-ideals` usa diálogo propio (`club-ideal-form-dialog.tsx`).
- Traducciones de catálogos: `TranslationsTabsField` (admite `secondField`) y `src/lib/generic-catalogs-i18n/{actions,helpers}.ts`.
- Un catálogo nuevo de tipo genérico: registra la config en `lib/catalogs/entities.ts`, crea `catalogs/<entidad>/page.tsx` y usa el orquestador que corresponda a su forma.

Otros usos legítimos de `Dialog` (todos con ≤4 campos o solo lectura): acción puntual parametrizada (`member-of-month/evaluate-dialog.tsx`), historial inline (`investiture/pipeline-history-dialog.tsx`), formulario secundario embebido en un panel de detalle (`clubs/club-sections-panel.tsx`).

---

## 16. Formularios

### 16.1 Estructura

```tsx
<Field>
  <FieldLabel htmlFor="name">Nombre <span className="ml-0.5 text-destructive">*</span></FieldLabel>
  <Input id="name" name="name" />
  <FieldError>{error}</FieldError>
</Field>
```

- Componentes de `ui/field.tsx`: `FieldGroup`, `FieldSet`, `FieldLegend` (`variant="label"` para secciones), `Field`, `FieldLabel`, `FieldDescription`, `FieldError`. Una sección no repite su título como `<h3>` suelto.
- Etiqueta siempre visible y enlazada (`htmlFor`/`id`). Los campos obligatorios llevan asterisco `text-destructive`.
- `SelectTrigger className="w-full"` en formularios de página.
- Espaciado entre campos `space-y-4` (o `gap-4` en `FieldSet`).

### 16.2 Validación

Cliente: Zod + React Hook Form. Servidor: server actions con Zod y `fieldErrors`. Errores de campo inline; error general en `Alert` destructivo. Un campo inválido lleva `aria-invalid`.

### 16.3 Tipos de campo

| Tipo | Componente |
|---|---|
| Texto, email, número | `Input` |
| Contraseña | `Input type="password"` con toggle de visibilidad |
| Fecha | `Input type="date"` o `Calendar` en `Popover`; formato `yyyy-MM-dd` |
| Texto largo | `Textarea` (`rows` ≥ 3) |
| Booleano | `Switch` con etiqueta a la derecha |
| Selección | `Select` (o `Combobox` con búsqueda) |
| Aceptación / multi | `Checkbox` |

### 16.4 En modal, página y sheet

- Modal de ruta: `FormModalBody`/`FormModalFooter` (§14.1); botones `outline` (cancelar) y `default` (guardar) con `FormSubmitButton`.
- Dialog (excepciones): `DialogFooter className="gap-2 pt-2"`.
- Sheet compose: footer sticky con submit a ancho completo y `loading`.
- Advertencias: `Alert` con ícono, no `div` de color a mano.

### 16.5 Táctil

Campos ≥16px en `pointer: coarse`, `touch-action: manipulation` en controles, sin resaltado de toque, objetivos táctiles de **≥44px por debajo de `md`** (p. ej. `max-md:min-h-11` en ítems de submenú del sidebar; en controles nuevos, amplía el área con `after:-inset-*` como Checkbox y Switch). Atajos de teclado (`⌘J`) solo con `pointer: fine`.

---

## 17. Gráficos y datos auxiliares

Ver §2.5 para colores y §12.4 para criterio. `ui/chart.tsx` (wrapper de Recharts) es el único punto de entrada; los hex que contiene son una fuga conocida. Listas descriptivas en móvil: `dl` con `dt` `text-xs text-muted-foreground` y `dd` `text-sm`, o las filas de 2 líneas de §11.1.

---

## 18. Dark mode

- Valores en la columna "Oscuro" de §2; el selector es `@custom-variant dark (&:is(.dark *))`.
- Por defecto **claro**. `ThemeSwitcher` cicla `light → dark → system`. Persistencia: cookie `theme_mode` + clase `.dark` en `<html>` (`applyThemeMode`); `ThemeBootScript` evita el parpadeo. Sonner lee `resolvedThemeMode` del store de preferencias, no `useTheme()`.
- Usa tokens semánticos (`bg-card`, `text-muted-foreground`, `border-border`, `bg-x/10`); nunca paleta fija ni `bg-white`. Un color nuevo se valida en ambos temas.
- Particularidades oscuras: `--primary` (`#4C9AFF`) para texto y `--primary-solid` (`#0073EA`) para rellenos; `--destructive` `#F87171` para texto y `#DC2626` para relleno; `--accent` `#2A2A2A` y `--muted` `#232323` para que menús y skeletons se distingan de popover/card; los campos usan `dark:bg-input/30`; las sombras usan anillo blanco al 8%.
- Login y auth: panel de marca neutro (`bg-sidebar`), sin degradados, glows ni círculos decorativos; el azul solo en el botón de entrar. Card `rounded-2xl`. Entrada con `PAGE_ENTER_CLASSES`.

---

## 19. Responsive

- Mobile-first. Sidebar: `Sheet` en móvil. Listados: tabla desde `md`, filas de 2 líneas debajo (§11.1). Modales de formulario: hoja inferior en `max-sm`.
- Filtros con `flex-wrap`; campos a ancho completo en móvil; nunca scroll horizontal de la página.
- Objetivos táctiles ≥44px bajo `md` (§16.5); inputs ≥16px en táctil.
- Header de página: `flex-col gap-4 sm:flex-row sm:items-start sm:justify-between` (lo resuelve `PageHeader`).
- `theme-color` por esquema de color. Landscape sin inflado de fuente (`-webkit-text-size-adjust`).

---

## 20. Toasts

- `Toaster` en `src/app/layout.tsx`: `position="top-center"`, `closeButton`, **sin `richColors`**. Superficie neutra (`--popover`), el color vive solo en el ícono (success/error/warning/info). `expand={false}`, `visibleToasts={4}`.
- Copy corto y en pasado, sin "correctamente/exitosamente/con éxito": "Sección creada", "Registro desactivado". Título + `description` opcional (patrón de `PhaseECatalogCrudPage`).
- Errores de formulario o de página: banner/`Alert` en el lugar, no solo toast. `toast.error` para fallos de acciones sin lugar donde pintar el error.
- Un toast por acción; no los uses para estados persistentes.

---

## 21. Idioma y textos

- Español (neutro) por defecto; el panel está listo para `es`, `en`, `fr`, `pt-BR` (`messages/`, cookie `sacdia_admin_locale`). **Todo** texto de UI, `aria-label`, `title`, `sr-only`, placeholders y validaciones sale de `next-intl` (`useTranslations` / `getTranslations`). Namespaces compartidos: `shared.*` (`pageHeader`, `pagination`, `errorBanner`, `routeError`, `uiPrimitives`, `formModal`, `sortable`), `nav.*`, `catalogs.*`.
- Español en JSX fuera de i18n avisa con `hardcoded-spanish-ui`; la única excepción es `global-error.tsx` (§13.4).
- Números y fechas con el locale activo (`Intl.NumberFormat(locale)`); formato de fecha principal `dd/MM/yyyy`. Evita fijar `es-MX` en `toLocale…` (deuda conocida en ~10 sitios).
- Botones en infinitivo ("Crear", "Guardar"); confirmaciones como pregunta + contexto; vacíos "Sin registros" + ayuda; carga en gerundio ("Guardando…").
- Sentence case en etiquetas y títulos.

---

## 22. Estructura de archivos

```
src/
├── app/
│   ├── (auth)/                 login, verificar correo, restablecer
│   ├── (dashboard)/
│   │   ├── layout.tsx          shell: skip link, sidebar, header h-12, <main id="main-content">, slot @modal
│   │   ├── error.tsx           límite de ruta (§13.3)
│   │   ├── @modal/             rutas interceptadas de formularios
│   │   └── dashboard/<módulo>/ páginas, loading.tsx, _components
│   ├── (printable)/            vistas imprimibles
│   ├── global-error.tsx        error global (§13.4)
│   ├── layout.tsx              raíz: ThemeBootScript, preferencias, TooltipProvider, Toaster
│   └── globals.css             tokens, @theme, motion, reglas globales
├── components/
│   ├── ui/                     primitivos shadcn/Radix (§5)
│   ├── shared/                 componentes compartidos (§10)
│   ├── catalogs/               orquestadores y piezas de catálogos (§15)
│   └── <dominio>/              un directorio por dominio
├── lib/
│   ├── animations.ts           motion (§7)
│   ├── status/flag-status.ts   flagStatusIntent
│   ├── dashboard/sidebar-insights.ts
│   ├── icons/lucide-react-compat.tsx   generado, no editar
│   └── …                       api/, auth/, catalogs/, i18n/, providers/
├── navigation/sidebar/         ítems, filtrado, nav-match
├── types/tanstack-table.d.ts   ColumnMeta.className
└── i18n/ + messages/           next-intl
scripts/
├── audit-design-system.mjs     ejecutor del audit
└── design-system-rules.mjs     reglas (§23)
```

---

## 23. Audit y checklist

### 23.1 `pnpm audit:design-system`

Escanea `src/**/*.{ts,tsx,css}` línea por línea. Con `--strict` sale con código 1 si hay algún hallazgo de severidad **error**. Reglas en `scripts/design-system-rules.mjs` (tests en `design-system-rules.test.mjs`):

| Regla | Severidad | Detecta |
|---|---|---|
| `h1-font-bold` | error | `<h1>` con `font-bold` |
| `h1-font-semibold` | warn | `<h1>` suelto con `font-semibold` (usa `PageHeader`) |
| `tailwind-palette-bg` | warn | `bg-<paleta>-<n>` de Tailwind |
| `tailwind-palette-text` | warn | `text-<paleta>-<n>` de Tailwind |
| `hardcoded-spanish-ui` | warn | Español fijo en `title`/`description`/`label`/`aria-label`/`placeholder` |
| `uppercase-tracking` | error | `uppercase` + `tracking-*` |
| `pill-radius` | error | `rounded-3xl` / `rounded-4xl` |
| `semantic-text-on-solid` | error | `bg-success\|warning\|info\|destructive` con texto blanco o `*-foreground` |
| `text-below-11px` | error | `text-[Npx]` con N < 11 |
| `off-scale-text` | warn | `text-[10\|11\|12\|14px]` |
| `window-confirm` | error | `window.confirm` / `confirm()` en `.tsx` |
| `dashed-empty-state` | warn | `border-dashed` en archivos con "No hay"/"Sin" y sin `EmptyState` |
| `hardcoded-pagination` | error | `>Anterior<` / `>Siguiente<` |
| `color-mix-darkening` | warn | `color-mix(... var(--success\|warning\|info\|destructive), black …)` |
| `side-stripe` | warn | Franjas laterales `absolute inset-y-0 left-0 w-1..4` |

No hay regla automática para: iconos decorativos en caja, `transition-all`, `backdrop-blur`, KPIs en cards, `Badge default/soft` como estado, filtros sin etiqueta ni errores tragados como vacío. Se revisan en code review con el checklist.

### 23.2 Checklist para pantallas nuevas

**Estructura**
- [ ] `PageHeader` como encabezado (un solo `h1`); detalle con breadcrumbs y hero.
- [ ] Contenido dentro de `<main>`; sin tocar skip link ni landmarks del shell.
- [ ] `loading.tsx` con `ListPageSkeleton` / `DetailPageSkeleton` que imite el layout real.
- [ ] Un fallo de carga muestra `EndpointErrorBanner` con reintento en el bloque; nunca un vacío.

**Listados**
- [ ] `DataTableShell` desde `md`; filas de 2 líneas debajo.
- [ ] `EmptyState` fuera de la tabla (`default` vs `no-results`).
- [ ] `DataTablePagination` (URL o controlada); sin texto de paginación manual.
- [ ] `RowActions` (patrón A o B); sin íconos sueltos ni acciones por hover.
- [ ] Cabeceras 12px muted sin banda; números a la derecha con `tabular-nums`.
- [ ] Una marca de estado por fila, mostrando la excepción (`StatusBadge`, no `Badge`).
- [ ] Cada filtro y búsqueda con etiqueta visible o `aria-label`.

**Formularios y CRUD**
- [ ] Crear/editar en modal de ruta interceptada (Dialog solo en catálogos simples y excepciones de §15).
- [ ] Eliminar con `AlertDialog` + `destructive-solid`; sin `window.confirm`.
- [ ] Botones asíncronos con `loading`; `FormSubmitButton` en forms con server action.
- [ ] Campos con `Label` + `id`; errores de campo inline.

**Visual**
- [ ] Tokens semánticos; texto de estado con `text-x`, relleno con `bg-x-solid text-x-foreground`.
- [ ] Sin cajas de ícono, franjas laterales, bandas, degradados, glass ni blur.
- [ ] Radios por rol (§4.1); superficies flotantes con `shadow-lg` sola.
- [ ] Nada bajo 11px; `text-2xs` o `text-xs`; sin `uppercase` + `tracking`.
- [ ] Probado en claro y oscuro.

**Motion y accesibilidad**
- [ ] Sin `transition-all`; una sola curva; press 0.97 solo en botones.
- [ ] Sin animación en acciones frecuentes o de teclado; `motion-reduce` respetado.
- [ ] Objetivos táctiles ≥44px bajo `md`; foco visible; íconos decorativos `aria-hidden`.

**Texto**
- [ ] Todo el texto vía `next-intl`, locale activo para números y fechas.
- [ ] Toasts cortos y en pasado.

**Antes de abrir el PR**
- [ ] `pnpm audit:design-system --strict` sin errores; `pnpm typecheck`, `pnpm lint` y `pnpm test` limpios.
- [ ] Sin imports sin usar.

---

## 24. Fuentes de verdad

| Qué | Dónde |
|---|---|
| Tokens de color, sombras, motion | `src/app/globals.css` |
| Curvas, press, overlays | `src/lib/animations.ts` |
| Primitivos | `src/components/ui/*` |
| Compartidos | `src/components/shared/*` |
| Reglas del audit | `scripts/design-system-rules.mjs` |
| Sidebar | `src/navigation/sidebar/*`, `src/lib/dashboard/sidebar-insights.ts` |
| Auditoría que originó esta versión | `../docs/audit/ADMIN-DESIGN-AUDIT-2026-11.md` |

---

## 25. Historial

- **2026-04-15 — Ember**: primera reescritura visual (Geist, Hugeicons, `--radius` mayor, header `h-12`).
- **2026-04-16 — Auditoría de drift**: se documentan `Badge link`, `calendar`, `command`, `popover`, `progress`, `radio-group`, `scroll-area`, `sonner` y `EndpointErrorBanner`.
- **2026-06-24 — Scout Vibrante**: paleta alineada con `sacdia-app` (`#0073EA`, `#4FBF9F`, `#FBBD5E`).
- **2026-08-23 / 2026-09-17**: `PageHeader` y motion alineados con `animations.ts`; navegación y tablas sin enter/stagger; `⌘B` instantáneo; Geist único.
- **2026-10-13 — Alineación antislop**: radios por rol, sentence case, diales (§0), reglas `pill-radius` y `uppercase-tracking`.
- **2026-10-15 — Crisp**: neutros puros y acento azul; split `--primary` / `--primary-solid`; sombras con anillo hairline; `--radius: 0.5rem`; `destructive-solid`; `RowActions`; `Button loading`; crear/editar en modal de ruta interceptada; toasts neutros; móvil (bottom sheet, 16px, objetivos táctiles).
- **2026-11-08 — Auditoría de diseño**: split semántico texto/relleno (`--x` / `--x-solid`) con contraste AA y destructive oscuro `#F87171`; `text-2xs` y piso de 11px; `PRESS_SCALE` único (0.97, solo botones) y overlays iguales (`bg-black/40`, sin blur, 200/150ms); `shadow-lg` en flotantes; `KpiStrip` sin tiles; listado unificado (`DataTableShell`, filas móviles, `DataTablePagination` URL/controlada); `error.tsx` y `global-error`, skip link y landmarks; sidebar con alcance, contadores y un solo ítem activo; skeletons `ListPageSkeleton`/`DetailPageSkeleton`; nuevas reglas del audit; reescritura de este documento como fuente única (cuerpo = estado actual, historial al final).
