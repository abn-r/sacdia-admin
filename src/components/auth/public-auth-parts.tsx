import Image from "next/image";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { PAGE_ENTER_CLASSES } from "@/lib/animations";
import { cn } from "@/lib/utils";

/** Logo of the access screens (same file everywhere). */
export const ACCESS_LOGO_SRC = "/brand/sacdia-logo.png";

/** Logo block shared by the public pages linked from emails. */
export function BrandMark({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <Image
        src={ACCESS_LOGO_SRC}
        alt="SACDIA"
        width={40}
        height={40}
        className="size-10 rounded-[10px]"
        priority
      />
      <div className="leading-tight">
        <div className="text-base font-semibold tracking-tight text-foreground">
          SACDIA
        </div>
        <div className="font-mono text-2xs text-muted-foreground">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

/** Centered card of the public pages (forgot, reset, verify). */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "w-full max-w-[420px] rounded-2xl border bg-card p-8 text-card-foreground shadow-card",
        PAGE_ENTER_CLASSES,
      )}
    >
      {children}
    </div>
  );
}

export function StatusMessage({
  tone,
  title,
  body,
}: {
  tone: "success" | "error";
  title: string;
  body: string;
}) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div role={tone === "error" ? "alert" : "status"} className="space-y-3">
      <Icon
        className={cn(
          "size-8",
          tone === "success" ? "text-primary" : "text-destructive",
        )}
      />
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
