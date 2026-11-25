"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileText, ImageIcon, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadHonorAsset } from "@/lib/api/honor-assets";
import {
  checkHonorAsset,
  HONOR_ASSET_RULES,
  type HonorAssetKind,
} from "@/lib/catalogs/honors/assets";

type HonorAssetFieldProps = {
  kind: HonorAssetKind;
  /** Form field that carries the URL (`honor_image` or `material_url`). */
  name: string;
  id: string;
  defaultValue?: string | null;
  required?: boolean;
};

/**
 * URL field with an upload button. Uploading stores the file and fills the
 * URL; the honor keeps the new file only once the form is saved.
 */
export function HonorAssetField({
  kind,
  name,
  id,
  defaultValue,
  required,
}: HonorAssetFieldProps) {
  const t = useTranslations("catalogs.entities.honors.assets");
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [brokenPreview, setBrokenPreview] = useState<string | null>(null);

  const rule = HONOR_ASSET_RULES[kind];
  const hasUrl = /^https?:\/\//.test(url.trim());
  const hintId = `${id}-hint`;

  async function handleFile(file: File) {
    const problem = checkHonorAsset(kind, file);
    if (problem) {
      toast.error(
        problem.kind === "type" ? t("typeError") : t("sizeError", { max: problem.maxMb }),
      );
      return;
    }
    setUploading(true);
    try {
      const uploadedUrl = await uploadHonorAsset(kind, file);
      setUrl(uploadedUrl);
      setBrokenPreview(null);
      toast.success(t("uploaded"));
    } catch (error) {
      toast.error(t("uploadError"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{kind === "image" ? t("imageLabel") : t("materialLabel")}</Label>
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {kind === "image" && hasUrl && brokenPreview !== url ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote R2 URL of any host; a preview, not page content
            <img
              src={url}
              alt={t("previewAlt")}
              className="size-full object-contain"
              onError={() => setBrokenPreview(url)}
            />
          ) : kind === "image" ? (
            <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
          ) : (
            <FileText className="size-5 text-muted-foreground" aria-hidden />
          )}
        </div>
        <Input
          id={id}
          name={name}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          required={required}
          placeholder={t("urlPlaceholder")}
          aria-describedby={hintId}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? null : <Upload className="size-4" aria-hidden />}
          {uploading ? t("uploading") : hasUrl ? t("replace") : t("upload")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          accept={rule.accept}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
      <div id={hintId} className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{kind === "image" ? t("imageHint") : t("materialHint")}</span>
        {kind === "material" && hasUrl ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
          >
            {t("viewFile")}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}
