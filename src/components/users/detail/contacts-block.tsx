import { Phone } from "lucide-react";
import { DetailSection } from "./section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
        <ul className="divide-y divide-border">
          {contacts.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                  aria-hidden
                >
                  {getInitials(c.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
                    {c.primary ? <Badge variant="secondary">{principalLabel}</Badge> : null}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {[c.relationship, c.phone].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              </div>
              {c.phone ? (
                <Button asChild size="sm" variant="outline" className="self-start sm:self-auto">
                  <a href={`tel:${c.phone.replace(/\s+/g, "")}`}>
                    <Phone className="size-3.5" aria-hidden />
                    {callLabel}
                  </a>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </DetailSection>
  );
}
