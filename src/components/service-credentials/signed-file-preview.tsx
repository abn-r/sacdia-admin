"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { PdfInlineViewer } from "@/components/shared/pdf-inline-viewer";

type Props = {
  url: string;
  mimeType: string | null;
  fileName: string | null;
  personName: string;
};

type Kind = "image" | "pdf" | "other";

function detectKind(mimeType: string | null, fileName: string | null): Kind {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  const name = (fileName ?? "").toLowerCase();
  if (/\.(png|jpe?g|webp|gif|heic)$/.test(name)) return "image";
  if (name.endsWith(".pdf")) return "pdf";
  return "other";
}

/**
 * Preview of the signed file: image inline, PDF in the shared inline viewer
 * (blob iframe, allowed by the CSP) and always an «open in a new tab» link.
 * The signed URL lives 15 minutes: the parent refetches the detail on open.
 */
export function SignedFilePreview({ url, mimeType, fileName, personName }: Props) {
  const t = useTranslations("service_credentials.detail.preview");
  const kind = detectKind(mimeType, fileName);
  // Keyed by URL: a new signed URL starts loading again without an effect.
  const [loaded, setLoaded] = useState<{ url: string; state: "ready" | "failed" } | null>(null);
  const imageState = loaded?.url === url ? loaded.state : "loading";

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border bg-muted/30">
        {kind === "image" ? (
          <div className="relative flex max-h-[60vh] min-h-40 items-center justify-center">
            {imageState === "loading" ? (
              <div
                className="absolute inset-0 flex items-center justify-center"
                role="status"
                aria-label={t("loading")}
              >
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : null}
            {imageState === "failed" ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("failed")}</p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL
              <img
                src={url}
                alt={t("imageAlt", { name: personName })}
                className="max-h-[60vh] w-auto max-w-full object-contain"
                onLoad={() => setLoaded({ url, state: "ready" })}
                onError={() => setLoaded({ url, state: "failed" })}
              />
            )}
          </div>
        ) : kind === "pdf" ? (
          <PdfInlineViewer
            src={url}
            title={t("pdfTitle", { name: personName })}
            className="h-[60vh] w-full"
          />
        ) : (
          <p className="p-6 text-center text-sm text-muted-foreground">{t("failed")}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("linkExpires")}</p>
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" />
            {t("openInNewTab")}
          </a>
        </Button>
      </div>
    </div>
  );
}
