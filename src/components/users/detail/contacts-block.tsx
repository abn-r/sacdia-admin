import { Mail, Phone } from "lucide-react";
import { DetailSection } from "./section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ContactEntry {
  id: string;
  name: string;
  phone: string | null;
  relationship: string | null;
  primary: boolean;
}

export interface ContactsBlockProps {
  num?: string;
  title: string;
  emptyMessage: string;
  missingPayloadMessage: string;
  principalLabel: string;
  callLabel: string;
  hasPayload: boolean;
  contacts: ContactEntry[];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ContactsBlock({
  num = "05",
  title,
  emptyMessage,
  missingPayloadMessage,
  principalLabel,
  callLabel,
  hasPayload,
  contacts,
}: ContactsBlockProps) {
  return (
    <DetailSection num={num} title={title}>
      {!hasPayload ? (
        <p className="text-sm text-muted-foreground">{missingPayloadMessage}</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid gap-3">
          {contacts.map((c) => (
            <div
              key={c.id}
              className={cn(
                "relative grid grid-cols-[48px_1fr_auto] items-center gap-3.5 rounded-xl border p-4",
                c.primary
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card",
              )}
            >
              {c.primary ? (
                <Badge variant="default" className="absolute right-3 top-2.5 text-[10px] uppercase">
                  {principalLabel}
                </Badge>
              ) : null}
              <div
                className={cn(
                  "grid size-12 place-items-center rounded-xl font-semibold text-white",
                  c.primary ? "bg-primary" : "bg-info",
                )}
                aria-hidden
              >
                {getInitials(c.name)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{c.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {[c.relationship, c.phone].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <div className="flex gap-1.5">
                {c.phone ? (
                  <Button asChild size="sm" variant={c.primary ? "default" : "outline"}>
                    <a href={`tel:${c.phone.replace(/\s+/g, "")}`}>
                      <Phone className="size-3.5" />
                      {callLabel}
                    </a>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    <Mail className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DetailSection>
  );
}
