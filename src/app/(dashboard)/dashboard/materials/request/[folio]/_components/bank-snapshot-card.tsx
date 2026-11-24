"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Landmark, Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/ui/copy-button";
import { FolioPill } from "@/components/materials/folio-pill";
import { MoneyFormat } from "@/components/materials/money-format";
import { PaymentSheetPrintButton } from "@/components/materials/payment-sheet-print-button";
import { Button } from "@/components/ui/button";
import type { Orden, MaterialConfig } from "@/lib/types/materials";
import {
  ordenWithBankDisplay,
  resolveBankDisplay,
} from "@/lib/materials/bank-display";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatClabe(clabe: string): string {
  return clabe.replace(/(\d{4})/g, "$1 ").trim();
}

function formatCentavosPlain(centavos: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

// ─── Field row ────────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  copyAriaLabel: string;
  copyText: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

function FieldRow({
  label,
  copyAriaLabel,
  copyText,
  children,
  fullWidth,
}: FieldRowProps) {
  return (
    <div
      className={fullWidth ? "sm:col-span-2 group flex items-start gap-3" : "group flex items-start gap-3"}
    >
      <div className="flex flex-1 flex-col">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <div className="text-sm text-foreground">{children}</div>
      </div>
      <CopyButton text={copyText} ariaLabel={copyAriaLabel} />
    </div>
  );
}

// ─── Copy-all button ──────────────────────────────────────────────────────────

interface CopyAllButtonProps {
  text: string;
}

function CopyAllButton({ text }: CopyAllButtonProps) {
  const t = useTranslations("ops.materials.bank");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={copy}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? t("copied") : t("copyAll")}
    </Button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BankSnapshotCardProps {
  orden: Orden;
  liveConfig?: MaterialConfig | null;
}

export function BankSnapshotCard({ orden, liveConfig }: BankSnapshotCardProps) {
  const t = useTranslations("materials.components.bankSnapshotCard");
  const tb = useTranslations("ops.materials.bank");
  const display = resolveBankDisplay(orden, liveConfig);
  const clabe = display.bank_account_clabe;
  const hasBank = display.source !== "missing" && Boolean(clabe);

  if (!hasBank || !clabe) {
    return (
      <section
        aria-labelledby="bank-snapshot-heading"
        className="rounded-xl bg-warning/10 p-5"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <div className="space-y-1">
            <h2 id="bank-snapshot-heading" className="text-sm font-semibold text-warning-foreground">
              {tb("notConfiguredTitle")}
            </h2>
            <p className="text-sm text-warning-foreground/80">
              {tb.rich("notConfiguredBody", {
                link: (chunks) => (
                  <Link
                    href="/dashboard/configuration/local-field/payment-methods"
                    className="font-medium text-warning-foreground underline underline-offset-4"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const formattedClabe = formatClabe(clabe);
  const totalString = formatCentavosPlain(orden.total_centavos);
  const displayOrden = ordenWithBankDisplay(orden, display);

  const copyAllLines: string[] = [];
  if (orden.folio_referencia) copyAllLines.push(`${tb("folio")}: ${orden.folio_referencia}`);
  copyAllLines.push(`${tb("total")}: ${totalString}`);
  if (display.bank_name) copyAllLines.push(`${tb("bank")}: ${display.bank_name}`);
  copyAllLines.push(`${tb("clabe")}: ${clabe}`);
  if (display.account_holder) copyAllLines.push(`${tb("holder")}: ${display.account_holder}`);
  if (orden.entrega === "recoger" && display.pickup_address) {
    copyAllLines.push(`${t("labelPickupAddress")}: ${display.pickup_address}`);
  }

  return (
    <section
      aria-labelledby="bank-snapshot-heading"
      className="rounded-xl bg-card p-5 shadow-card"
    >
      {display.source === "live" && (
        <div className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
          {t("liveConfigNotice")}
        </div>
      )}

      <div className="mb-5 flex items-center gap-2">
        <Landmark className="size-5 text-muted-foreground" aria-hidden />
        <h2
          id="bank-snapshot-heading"
          className="text-sm font-semibold"
        >
          {tb("title")}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <PaymentSheetPrintButton orden={displayOrden} />
          <CopyAllButton text={copyAllLines.join("\n")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {orden.folio_referencia && (
          <FieldRow
            label={tb("folio")}
            copyAriaLabel={tb("copyFolio")}
            copyText={orden.folio_referencia}
          >
            <FolioPill folio={orden.folio_referencia} />
          </FieldRow>
        )}

        <FieldRow
          label={tb("total")}
          copyAriaLabel={tb("copyTotal")}
          copyText={totalString}
        >
          <span className="text-base font-semibold tabular-nums">
            <MoneyFormat centavos={orden.total_centavos} />
          </span>
        </FieldRow>

        {display.bank_name && (
          <FieldRow
            label={tb("bank")}
            copyAriaLabel={tb("copyBank")}
            copyText={display.bank_name}
          >
            {display.bank_name}
          </FieldRow>
        )}

        <FieldRow
          label={tb("clabe")}
          copyAriaLabel={tb("copyClabe")}
          copyText={clabe}
        >
          <span className="font-mono tracking-tight">{formattedClabe}</span>
        </FieldRow>

        {display.account_holder && (
          <FieldRow
            label={tb("holder")}
            copyAriaLabel={tb("copyHolder")}
            copyText={display.account_holder}
          >
            {display.account_holder}
          </FieldRow>
        )}

        {orden.entrega === "recoger" && display.pickup_address && (
          <FieldRow
            label={t("labelPickupAddress")}
            copyAriaLabel={t("copyPickupAddress")}
            copyText={display.pickup_address}
            fullWidth
          >
            {display.pickup_address}
          </FieldRow>
        )}
      </div>
    </section>
  );
}
