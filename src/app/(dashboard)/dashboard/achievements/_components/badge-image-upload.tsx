"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { uploadAchievementImage } from "@/lib/api/achievements";
import type { AchievementTier } from "@/lib/api/achievements";
import { toast } from "sonner";

const TIER_RING_COLORS: Record<AchievementTier, string> = {
  BRONZE: "#CD7F32",
  SILVER: "#C0C0C0",
  GOLD: "#FFD700",
  PLATINUM: "#E5E4E2",
  DIAMOND: "#B9F2FF",
};

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ["image/png", "image/svg+xml", "image/webp"];

interface Props {
  achievementId?: number | null;
  currentImageUrl?: string | null;
  tier: AchievementTier;
  onUploaded?: (url: string) => void;
}

function validateFile(
  file: File,
  typeError: string,
  sizeError: string,
): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return typeError;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return sizeError;
  }
  return null;
}

export function BadgeImageUpload({
  achievementId,
  currentImageUrl,
  tier,
  onUploaded,
}: Props) {
  const t = useTranslations("achievements.imageUpload");
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const ringColor = TIER_RING_COLORS[tier];

  async function processFile(file: File) {
    const error = validateFile(file, t("validateTypeError"), t("validateSizeError"));
    if (error) {
      toast.error(error);
      return;
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    if (!achievementId) {
      // Can't upload without an ID — just preview
      toast.warning(t("toastSaveFirst"));
      return;
    }

    try {
      setUploading(true);
      const result = await uploadAchievementImage(achievementId, file);
      onUploaded?.(result.badge_image_url);
      toast.success(t("toastSuccess"));
    } catch {
      toast.error(t("toastError"));
      setPreview(currentImageUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleClear() {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={t("dropzoneAriaLabel")}
        className={[
          "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <Loader2 className="mb-3 size-8 animate-spin text-muted-foreground" />
        ) : (
          <UploadCloud className="mb-3 size-8 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">
          {uploading ? t("uploading") : t("dropzonePrompt")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t("dropzoneHint")}</p>

        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".png,.svg,.webp,image/png,image/svg+xml,image/webp"
          onChange={handleInputChange}
          aria-hidden="true"
        />
      </div>

      {/* Preview */}
      {preview && (
        <div className="flex items-center gap-4">
          <div
            className="relative size-20 shrink-0 overflow-hidden rounded-full"
            style={{
              boxShadow: `0 0 0 3px ${ringColor}, 0 0 0 5px ${ringColor}40`,
            }}
          >
            <Image
              src={preview}
              alt={t("previewAlt")}
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">{t("previewTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {t("tierLabel")}{" "}
              <span className="font-medium" style={{ color: ringColor }}>
                {tier}
              </span>
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleClear}
            aria-label={t("removeAriaLabel")}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {!preview && (
        <div className="flex items-center gap-4">
          <div
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-muted"
            style={{
              boxShadow: `0 0 0 3px ${ringColor}40`,
            }}
          >
            <ImageIcon className="size-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("noImageLabel")}</p>
            <p className="text-xs text-muted-foreground">
              {t("tierLabel")}{" "}
              <span style={{ color: ringColor }} className="font-medium">
                {tier}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
