# Reporte mensual imprimible

`MonthlyReport` es una plantilla HTML semántica de dos páginas carta vertical,
editable en pantalla y exportable mediante el diálogo de impresión del navegador.

## Vista de ejemplo

Con el panel en ejecución, abrir `/reports/monthly-preview` o seleccionar
**Vista imprimible** desde **Reportes Mensuales**. La página requiere una sesión
administrativa, pero se renderiza fuera del shell del dashboard para que la
impresión contenga únicamente el documento.

Usar **Imprimir / Guardar PDF**, seleccionar tamaño **Carta**, orientación
**vertical**, escala **100 %** y activar la impresión de fondos. La hoja de
estilos ya declara `@page { size: Letter portrait; margin: 0; }` y fuerza el
salto después de la primera página.

## Integración

```tsx
import { MonthlyReport } from "@/components/reports/monthly-report/monthly-report";
import type { MonthlyReportData } from "@/components/reports/monthly-report/monthly-report.types";

export function PrintableReport({ data }: { data: MonthlyReportData }) {
  return <MonthlyReport initialData={data} />;
}
```

El modelo es intencionalmente independiente del contrato API actual. Antes de
guardar este formulario, se debe definir y versionar el endpoint que persista
los campos nuevos; no se deben enviar como `manual_data` del reporte mensual
actual, porque ese DTO no los contempla.

## Activos oficiales

La plantilla carga exclusivamente estos archivos locales:

- `public/brand/iasd-logo-horizontal.svg`
- `public/brand/iasd-symbol.svg`

No estaban presentes al implementar la vista. Si faltan en desarrollo, la
plantilla muestra una advertencia visible en vez de inventar o redibujar el
logotipo. Copiar los archivos oficiales en esas rutas antes de publicar.
