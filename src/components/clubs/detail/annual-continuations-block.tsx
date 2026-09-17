"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  listAnnualContinuationsFromClient,
  submitAnnualContinuationsFromClient,
  type ContinuationListItem,
} from "@/lib/api/annual-continuations";

function classLabel(item: ContinuationListItem): string {
  const suggested = item.suggested_class;
  if (suggested.status === "resolved" && suggested.class_id != null) {
    return String(suggested.class_id);
  }
  return suggested.code ?? item.blocked_reason ?? suggested.status;
}

export function AnnualContinuationsBlock({ sectionId }: { sectionId: number }) {
  const t = useTranslations("clubs.detail.sections");
  const [items, setItems] = useState<ContinuationListItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await listAnnualContinuationsFromClient(sectionId, { limit: 100 });
      setItems(rows);
      setSelected(new Set());
    } catch {
      setError(t("continuationsLoadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // sectionId is the list key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  function toggle(userId: string, eligible: boolean) {
    if (!eligible) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const results = await submitAnnualContinuationsFromClient(
        sectionId,
        [...selected],
      );
      const enrolled = results.filter((row) => row.outcome === "enrolled").length;
      const blocked = results.filter((row) => row.outcome === "blocked").length;
      const failed = results.filter((row) => row.outcome === "failed").length;
      setNotice(t("continuationsResult", { enrolled, blocked, failed }));
      await load();
    } catch {
      setError(t("continuationsSubmitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 space-y-2 rounded-xl border border-border/70 bg-muted/10 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("continuationsHeading")}
      </p>
      <p className="text-[11px] text-muted-foreground">{t("continuationsHint")}</p>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          {t("continuationsLoading")}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("continuationsEmpty")}</p>
      ) : (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto">
          {items.map((item) => {
            const eligible = item.eligibility === "eligible";
            return (
              <li key={item.user_id}>
                <label className="flex items-start gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    disabled={!eligible}
                    checked={selected.has(item.user_id)}
                    onChange={() => toggle(item.user_id, eligible)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t("continuationsClass")}: {classLabel(item)}
                    </span>
                    {!eligible ? (
                      <span className="block text-[11px] text-destructive">
                        {item.blocked_reason ?? item.suggested_class.code ?? t("continuationsBlocked")}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? <p className="text-xs text-primary">{notice}</p> : null}

      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={submitting || selected.size === 0}
        onClick={() => void submit()}
      >
        {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {t("continuationsSubmit")}
      </Button>
    </div>
  );
}
