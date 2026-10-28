import Image from "next/image";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Logo block shared by the public pages linked from emails. */
export function BrandMark({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <Image
        src="/app-icon.jpg"
        alt="SACDIA"
        width={40}
        height={40}
        className="size-10 rounded-xl"
        priority
      />
      <div className="leading-tight">
        <div className="text-base font-bold tracking-tight text-foreground">
          SACDIA
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          {subtitle}
        </div>
      </div>
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
