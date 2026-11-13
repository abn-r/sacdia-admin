"use client";

/**
 * EventAttachmentsSection — manage PDF/image attachments of a camporee event.
 *
 * Talks to the API directly (not through the surrounding <form> server action),
 * so it must not be wrapped in a nested <form>. Only rendered for existing events.
 */

import { useRef, useState } from "react";
import { ExternalLink, FileText, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  CAMPOREE_ATTACHMENT_ACCEPT,
  CAMPOREE_ATTACHMENT_ALLOWED_MIME,
  CAMPOREE_ATTACHMENT_MAX_BYTES,
  CAMPOREE_ATTACHMENT_MAX_PER_EVENT,
  deleteCamporeeEventAttachment,
  listCamporeeEventAttachments,
  uploadCamporeeEventAttachment,
  type CamporeeEventAttachment,
} from "@/lib/api/camporee-events";
import { cn } from "@/lib/utils";

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(kb)} KB`;
  return `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(kb / 1024)} MB`;
}

type Props = {
  eventId: number;
  initialAttachments?: CamporeeEventAttachment[];
};

export function EventAttachmentsSection({ eventId, initialAttachments = [] }: Props) {
  const t = useTranslations("camporees.eventInstanceForm.attachments");
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<CamporeeEventAttachment[]>(initialAttachments);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadingNames, setUploadingNames] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [toDelete, setToDelete] = useState<CamporeeEventAttachment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const max = CAMPOREE_ATTACHMENT_MAX_PER_EVENT;
  const uploading = uploadingNames.length > 0;
  const atLimit = items.length >= max;

  async function refresh() {
    try {
      setItems(await listCamporeeEventAttachments(eventId));
    } catch {
      toast.error(t("loadFailed"));
    }
  }

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const problems: string[] = [];
    const valid: File[] = [];
    let slots = max - items.length;

    for (const file of files) {
      if (!(CAMPOREE_ATTACHMENT_ALLOWED_MIME as readonly string[]).includes(file.type)) {
        problems.push(t("errorType", { name: file.name }));
      } else if (file.size > CAMPOREE_ATTACHMENT_MAX_BYTES) {
        problems.push(t("errorSize", { name: file.name }));
      } else if (slots <= 0) {
        problems.push(t("errorLimit", { max }));
        break;
      } else {
        valid.push(file);
        slots -= 1;
      }
    }
    setErrors(problems);
    if (valid.length === 0) return;

    setUploadingNames(valid.map((f) => f.name));
    let uploadedAny = false;
    const serverErrors: string[] = [];
    for (const file of valid) {
      try {
        const created = await uploadCamporeeEventAttachment(eventId, file);
        uploadedAny = true;
        setItems((prev) => [...prev, created]);
        toast.success(t("uploaded", { name: file.name }));
      } catch (err) {
        const message = err instanceof Error && err.message ? err.message : t("uploadFailed");
        serverErrors.push(message);
        toast.error(message);
      }
    }
    setUploadingNames([]);
    if (serverErrors.length > 0) setErrors((prev) => [...prev, ...serverErrors]);
    if (uploadedAny) void refresh();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCamporeeEventAttachment(eventId, toDelete.attachment_id);
      toast.success(t("deleted"));
      setToDelete(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="event-attachments-title">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 id="event-attachments-title" className="text-sm font-medium">
            {t("title")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("description", { max })}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {t("count", { count: items.length, max })}
        </span>
      </div>

      <div
        data-testid="attachments-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading && !atLimit) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!uploading && !atLimit) void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-wrap items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground transition-colors",
          dragging && "border-primary bg-primary/10 text-foreground",
        )}
      >
        {uploading ? (
          <span className="inline-flex items-center gap-2" role="status">
            <Loader2 className="size-4 animate-spin" />
            {t("uploading")}
          </span>
        ) : (
          <>
            <Upload className="size-4" aria-hidden />
            <span>{t("dropPrefix")}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={atLimit}
              onClick={() => inputRef.current?.click()}
            >
              {t("pick")}
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={CAMPOREE_ATTACHMENT_ACCEPT}
          className="sr-only"
          data-testid="attachments-input"
          disabled={uploading || atLimit}
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            e.target.value = "";
            void handleFiles(files);
          }}
        />
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1 text-sm text-destructive" role="alert">
          {errors.map((message, i) => (
            <li key={`${i}-${message}`}>{message}</li>
          ))}
        </ul>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => {
            const isImage = item.mime_type.startsWith("image/");
            return (
              <li key={item.attachment_id} className="flex items-center gap-3 p-2.5">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived backend URL
                    <img src={item.url} alt="" className="size-full object-cover" />
                  ) : (
                    <FileText className="size-5" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={item.file_name}>
                    {item.file_name}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    {isImage ? <ImageIcon className="size-3" aria-hidden /> : null}
                    {formatAttachmentSize(item.size_bytes)}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" asChild>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t("open")}: ${item.file_name}`}
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${t("delete")}: ${item.file_name}`}
                  onClick={() => setToDelete(item)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { name: toDelete?.file_name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-solid"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? t("deleting") : t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
