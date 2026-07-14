import type { Comprobante } from "@/lib/types/materials";

export type ReceiptPrintContext = {
  orderFolio: string;
  orderTotalCentavos: number;
  directorNombre?: string | null;
  directorClub?: string | null;
  bankName?: string | null;
  bankAccountClabe?: string | null;
  accountHolder?: string | null;
};

export function buildReceiptPrintContextFromOrder(orden: {
  folio_referencia: string | null;
  id: string;
  total_centavos: number;
  director?: { nombre: string | null; club: string | null } | null;
  bank_name?: string | null;
  bank_account_clabe?: string | null;
  account_holder?: string | null;
}): ReceiptPrintContext {
  return {
    orderFolio: orden.folio_referencia ?? orden.id,
    orderTotalCentavos: orden.total_centavos,
    directorNombre: orden.director?.nombre,
    directorClub: orden.director?.club,
    bankName: orden.bank_name,
    bankAccountClabe: orden.bank_account_clabe,
    accountHolder: orden.account_holder,
  };
}

export type PaymentSheetPrintInput = {
  folio_referencia: string | null;
  id: string;
  total_centavos: number;
  subtotal_centavos: number;
  envio_centavos: number;
  entrega: "recoger" | "envio";
  bank_name?: string | null;
  bank_account_clabe?: string | null;
  account_holder?: string | null;
  pickup_address?: string | null;
  director?: { nombre: string | null; club: string | null } | null;
};

export function buildPaymentSheetPrintDocument(orden: PaymentSheetPrintInput): string {
  const folio = orden.folio_referencia ?? orden.id;
  const printedAt = formatDateTime(new Date().toISOString());
  const clabe = orden.bank_account_clabe?.replace(/(\d{4})/g, "$1 ").trim() ?? "—";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ficha de pago ${escapeHtml(folio)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      color: #111;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 13px;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 2px solid #111;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand { font-size: 18px; font-weight: 700; }
    .subtitle { color: #555; margin-top: 4px; }
    .meta { text-align: right; color: #555; font-size: 12px; }
    h2 {
      margin: 0 0 8px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #444;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    th, td {
      padding: 8px 0;
      border-bottom: 1px solid #e5e5e5;
      text-align: left;
      vertical-align: top;
    }
    th { width: 34%; color: #555; font-weight: 600; padding-right: 12px; }
    .total { font-size: 18px; font-weight: 700; }
    .note {
      margin-top: 16px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      color: #444;
      background: #fafafa;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 11px;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 16mm; }
    }
  </style>
</head>
<body>
  <header class="header">
    <div>
      <div class="brand">SACDIA</div>
      <div class="subtitle">Ficha de pago — Materiales</div>
    </div>
    <div class="meta">
      <div><strong>Folio:</strong> ${escapeHtml(folio)}</div>
      <div>Impreso: ${escapeHtml(printedAt)}</div>
    </div>
  </header>

  <section>
    <h2>Solicitud</h2>
    <table>
      ${optionalRow("Director", orden.director?.nombre)}
      ${optionalRow("Club", orden.director?.club)}
      ${row("Subtotal", escapeHtml(formatMoney(orden.subtotal_centavos)))}
      ${row("Envío", escapeHtml(formatMoney(orden.envio_centavos)))}
      ${row("Total a pagar", `<span class="total">${escapeHtml(formatMoney(orden.total_centavos))}</span>`)}
      ${row("Entrega", escapeHtml(orden.entrega === "recoger" ? "Recoger en sede" : "Envío"))}
    </table>
  </section>

  <section>
    <h2>Datos bancarios</h2>
    <table>
      ${optionalRow("Banco", orden.bank_name)}
      ${row("CLABE", escapeHtml(clabe))}
      ${optionalRow("Titular", orden.account_holder)}
      ${orden.entrega === "recoger" ? optionalRow("Recoger en", orden.pickup_address) : ""}
    </table>
  </section>

  <p class="note">
    Usa este folio como referencia al realizar la transferencia. Conserva tu comprobante bancario
    y súbelo en la app cuando completes el pago.
  </p>

  <footer class="footer">
    Documento generado desde SACDIA Admin.
  </footer>
</body>
</html>`;
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(centavos: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

function row(label: string, value: string): string {
  return `<tr><th>${escapeHtml(label)}</th><td>${value}</td></tr>`;
}

function optionalRow(label: string, value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return row(label, escapeHtml(value));
}

export function buildReceiptPrintDocument(
  comprobante: Comprobante,
  context: ReceiptPrintContext,
): string {
  const statusLabel = STATUS_LABELS[comprobante.status] ?? comprobante.status;
  const printedAt = formatDateTime(new Date().toISOString());

  const bankRows = [
    optionalRow("Banco", context.bankName),
    optionalRow("CLABE", context.bankAccountClabe),
    optionalRow("Titular", context.accountHolder),
  ]
    .filter(Boolean)
    .join("");

  const bankSection =
    bankRows.length > 0
      ? `<section class="section"><h2>Datos bancarios del pedido</h2><table>${bankRows}</table></section>`
      : "";

  const attachmentBlock =
    comprobante.signed_url && isImageMime(comprobante.mime_type)
      ? `<figure class="attachment"><img src="${escapeHtml(comprobante.signed_url)}" alt="Comprobante adjunto" /></figure>`
      : comprobante.signed_url
        ? `<p class="note">Archivo adjunto: ${escapeHtml(comprobante.file_name)} (${escapeHtml(comprobante.mime_type)}). Abre el enlace del sistema para ver el documento completo.</p>`
        : `<p class="note">Sin vista previa disponible para este archivo.</p>`;

  const rejectBlock =
    comprobante.status === "rechazado" && comprobante.reject_reason
      ? `<p class="reject">Motivo de rechazo: ${escapeHtml(comprobante.reject_reason)}</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Comprobante ${escapeHtml(context.orderFolio)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      color: #111;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 13px;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 2px solid #111;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand { font-size: 18px; font-weight: 700; letter-spacing: 0.02em; }
    .subtitle { color: #555; margin-top: 4px; }
    .meta { text-align: right; color: #555; font-size: 12px; }
    .section { margin-bottom: 18px; }
    h2 {
      margin: 0 0 8px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #444;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 6px 0;
      vertical-align: top;
      border-bottom: 1px solid #e5e5e5;
      text-align: left;
    }
    th {
      width: 34%;
      color: #555;
      font-weight: 600;
      padding-right: 12px;
    }
    .status {
      display: inline-block;
      padding: 2px 8px;
      border: 1px solid #ccc;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }
    .attachment {
      margin: 12px 0 0;
      text-align: center;
    }
    .attachment img {
      max-width: 100%;
      max-height: 520px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    .note, .reject { margin-top: 10px; color: #555; }
    .reject { color: #b42318; }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 11px;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 16mm; }
    }
  </style>
</head>
<body>
  <header class="header">
    <div>
      <div class="brand">SACDIA</div>
      <div class="subtitle">Comprobante de pago</div>
    </div>
    <div class="meta">
      <div><strong>Folio:</strong> ${escapeHtml(context.orderFolio)}</div>
      <div>Impreso: ${escapeHtml(printedAt)}</div>
    </div>
  </header>

  <section class="section">
    <h2>Pedido</h2>
    <table>
      ${optionalRow("Director", context.directorNombre)}
      ${optionalRow("Club", context.directorClub)}
      ${row("Total del pedido", escapeHtml(formatMoney(context.orderTotalCentavos)))}
    </table>
  </section>

  ${bankSection}

  <section class="section">
    <h2>Comprobante</h2>
    <table>
      ${row("Archivo", escapeHtml(comprobante.file_name))}
      ${row("Estado", `<span class="status">${escapeHtml(statusLabel)}</span>`)}
      ${row("Monto declarado", escapeHtml(formatMoney(comprobante.monto_centavos)))}
      ${optionalRow("Fecha de pago", formatDate(comprobante.fecha_pago))}
      ${optionalRow("Referencia bancaria", comprobante.ref_bancaria_declarada)}
      ${row("Fecha de carga", escapeHtml(formatDate(comprobante.created_at)))}
      ${comprobante.validated_at ? row("Validado el", escapeHtml(formatDate(comprobante.validated_at))) : ""}
    </table>
    ${rejectBlock}
    ${attachmentBlock}
  </section>

  <footer class="footer">
    Documento generado desde SACDIA Admin. Uso interno de validación de pagos.
  </footer>
</body>
</html>`;
}

export function openReceiptPrintWindow(html: string): void {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  const triggerPrint = () => {
    printWindow.print();
  };

  const images = Array.from(printWindow.document.images);
  if (images.length === 0) {
    triggerPrint();
    return;
  }

  let loaded = 0;
  const onDone = () => {
    loaded += 1;
    if (loaded >= images.length) triggerPrint();
  };

  for (const image of images) {
    if (image.complete) onDone();
    else {
      image.addEventListener("load", onDone);
      image.addEventListener("error", onDone);
    }
  }
}
