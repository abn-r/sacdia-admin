"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getInvestitureRequestErrorMessage } from "@/components/investiture-requests/investiture-request-errors";
import {
  assignDistrictPastor,
  searchPastorCandidates,
  type PastorCandidate,
} from "@/lib/api/investiture-field-config";
import {
  CANDIDATE_QUERY_MAX,
  canSearchPastorCandidates,
  normalizeCandidateQuery,
} from "./pastor-candidate-query";

const SEARCH_DEBOUNCE_MS = 300;

export interface AssignPastorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  districtId: number;
  districtName: string;
  /** Pastors already assigned to the district; they are not offered again. */
  excludeUserIds: string[];
  /** Called after a successful assignment, before the dialog closes. */
  onAssigned: () => void;
}

/**
 * One flat field (the pastor), so a Dialog is the right container (DS 6.1.1).
 * The form lives in an inner component so closing the dialog discards the
 * search text, the results and the selection.
 */
export function AssignPastorDialog({
  open,
  onOpenChange,
  districtId,
  districtName,
  excludeUserIds,
  onAssigned,
}: AssignPastorDialogProps) {
  const t = useTranslations("investiture_config.pastors.assignDialog");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { district: districtName })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <AssignPastorForm
          districtId={districtId}
          excludeUserIds={excludeUserIds}
          onAssigned={onAssigned}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

type SearchResult = {
  /** Normalized query these candidates answer; stale results are ignored. */
  query: string;
  candidates: PastorCandidate[];
  failed: boolean;
};

interface AssignPastorFormProps {
  districtId: number;
  excludeUserIds: string[];
  onAssigned: () => void;
  onClose: () => void;
}

function AssignPastorForm({
  districtId,
  excludeUserIds,
  onAssigned,
  onClose,
}: AssignPastorFormProps) {
  const t = useTranslations("investiture_config.pastors.assignDialog");
  const tRoot = useTranslations("investiture_requests");
  const fieldId = useId();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [selected, setSelected] = useState<PastorCandidate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalized = normalizeCandidateQuery(query);
  const searchable = canSearchPastorCandidates(query);

  useEffect(() => {
    if (!searchable) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      searchPastorCandidates(normalized)
        .then((candidates) => {
          if (!cancelled) setResult({ query: normalized, candidates, failed: false });
        })
        .catch(() => {
          if (!cancelled) setResult({ query: normalized, candidates: [], failed: true });
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalized, searchable]);

  const current = searchable && result?.query === normalized ? result : null;
  const loading = searchable && current === null;
  const candidates = (current?.candidates ?? []).filter(
    (candidate) => !excludeUserIds.includes(candidate.user_id),
  );

  async function handleAssign() {
    if (!selected || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await assignDistrictPastor(districtId, selected.user_id);
      toast.success(t("assigned"));
      onAssigned();
      onClose();
    } catch (error) {
      toast.error(getInvestitureRequestErrorMessage(error, tRoot));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={fieldId}>{t("fieldLabel")}</Label>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              id={fieldId}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={pickerOpen}
              disabled={isSubmitting}
              className={cn(
                "h-9 w-full justify-between px-3 font-normal",
                !selected && "text-muted-foreground",
              )}
            >
              <span className="truncate text-sm">
                {selected ? selected.user_name ?? selected.email ?? selected.user_id : t("placeholder")}
              </span>
              <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                value={query}
                onValueChange={setQuery}
                maxLength={CANDIDATE_QUERY_MAX}
                placeholder={t("searchPlaceholder")}
              />
              <CommandList>
                {!searchable && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {t("minChars")}
                  </p>
                )}
                {loading && (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t("searching")}
                  </div>
                )}
                {current?.failed && (
                  <p className="px-3 py-6 text-center text-sm text-destructive">
                    {t("searchError")}
                  </p>
                )}
                {current && !current.failed && candidates.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {t("noResults")}
                  </p>
                )}
                {candidates.length > 0 && (
                  <CommandGroup>
                    {candidates.map((candidate) => (
                      <CommandItem
                        key={candidate.user_id}
                        value={candidate.user_id}
                        onSelect={() => {
                          setSelected(candidate);
                          setPickerOpen(false);
                        }}
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm">
                            {candidate.user_name ?? candidate.user_id}
                          </span>
                          {candidate.email && (
                            <span className="truncate text-xs text-muted-foreground">
                              {candidate.email}
                            </span>
                          )}
                        </div>
                        <Check
                          className={cn(
                            "ml-auto size-3.5 shrink-0",
                            selected?.user_id === candidate.user_id ? "opacity-100" : "opacity-0",
                          )}
                          aria-hidden="true"
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          {t("cancel")}
        </Button>
        <Button type="button" onClick={handleAssign} disabled={!selected || isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {isSubmitting ? t("assigning") : t("assign")}
        </Button>
      </DialogFooter>
    </>
  );
}
