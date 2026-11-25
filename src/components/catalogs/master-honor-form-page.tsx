"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  MasterHonorRulesEditor,
  type MasterHonorAuxCategory,
  type MasterHonorAuxDivision,
  type MasterHonorAuxHonor,
} from "@/components/catalogs/master-honor-rules-editor";
import { TranslationsTabsField } from "@/components/forms/translations-tabs-field";
import { FormSection, SectionFormPage } from "@/components/shared/section-form-page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MasterHonorPayload, MasterHonorRuleGroupPayload } from "@/lib/api/phase-e-catalogs";
import {
  countActiveGroups,
  describeRequirementGroup,
  type PhraseTranslator,
} from "@/lib/catalogs/master-honors/requirement-phrase";
import type { PhaseEActionState } from "@/lib/phase-e-catalogs/actions";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";

type FormAction = (prev: PhaseEActionState, data: FormData) => Promise<PhaseEActionState>;

export interface MasterHonorFormPageProps {
  mode: "create" | "edit";
  masterHonorId?: number;
  name: string;
  description: string;
  active: boolean;
  translations: CatalogTranslation[];
  payload: MasterHonorPayload;
  honors: MasterHonorAuxHonor[];
  honorCategories: MasterHonorAuxCategory[];
  divisions: MasterHonorAuxDivision[];
  /** Where Cancel and a successful save go. */
  listHref: string;
  saveAction: FormAction;
  recalculateAction?: FormAction;
}

/**
 * Master honor as a page with sections (Datos, A quién aplica, Requisitos).
 * Requirements read as a sentence; saving an existing master honor recalculates
 * it right after, and the save button says so.
 */
export function MasterHonorFormPage({
  mode,
  masterHonorId,
  name,
  description,
  active: initialActive,
  translations: initialTranslations,
  payload: initialPayload,
  honors,
  honorCategories,
  divisions,
  listHref,
  saveAction,
  recalculateAction,
}: MasterHonorFormPageProps) {
  const t = useTranslations("admin.catalogs.masterHonor");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [active, setActive] = useState(initialActive);
  const [translations, setTranslations] = useState(initialTranslations);
  const [payload, setPayload] = useState(initialPayload);

  const lookups = useMemo(() => {
    const honorNames = new Map(honors.map((h) => [h.honor_id, h.name]));
    const categoryNames = new Map(honorCategories.map((c) => [c.honor_category_id, c.name]));
    return {
      honorName: (id: number) => honorNames.get(id),
      categoryName: (id: number) => categoryNames.get(id),
    };
  }, [honors, honorCategories]);

  const phraseT: PhraseTranslator = (key, values) =>
    t(`phrase.${key}` as Parameters<typeof t>[0], values as never);

  const recalculates = mode === "edit" && Boolean(recalculateAction);
  const activeGroups = countActiveGroups(payload.requirement_groups);

  function handlePayloadChange(next: MasterHonorPayload) {
    setPayload(next);
    setDirty(true);
  }

  function handleSave() {
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    startTransition(async () => {
      const saved = await saveAction({}, data);
      if (saved.error) {
        toast.error(saved.error);
        return;
      }
      if (recalculates && recalculateAction && masterHonorId) {
        const idData = new FormData();
        idData.set("id", String(masterHonorId));
        const recalculated = await recalculateAction({}, idData);
        if (recalculated.error) {
          toast.error(t("recalculateFailed"), { description: recalculated.error });
          setDirty(false);
          router.refresh();
          return;
        }
      }
      toast.success(recalculates ? t("savedRecalculated") : t("saved"));
      setDirty(false);
      router.push(listHref);
      router.refresh();
    });
  }

  function renderGroupSummary(group: MasterHonorRuleGroupPayload, index: number) {
    const { phrase, kind } = describeRequirementGroup(group, lookups, phraseT);
    return (
      <div className="flex items-start gap-3" data-testid={`master-honor-group-phrase-${index}`}>
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted font-medium text-muted-foreground text-xs tabular-nums">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm">{phrase}</p>
          <p className="text-muted-foreground text-xs">{kind}</p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: "master-honor-data", title: t("sections.data") },
    { id: "master-honor-scope", title: t("sections.scope") },
    { id: "master-honor-requirements", title: t("sections.requirements") },
  ];

  return (
    <form
      ref={formRef}
      onSubmit={(event) => event.preventDefault()}
      onChange={() => setDirty(true)}
    >
      {masterHonorId ? <input type="hidden" name="id" value={masterHonorId} /> : null}
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="active" value={active ? "true" : "false"} />
      <input type="hidden" name="master_honor_payload" value={JSON.stringify(payload)} />

      <SectionFormPage
        sections={sections}
        dirty={dirty}
        pending={pending}
        onSave={handleSave}
        onCancel={() => router.push(listHref)}
        saveLabel={recalculates ? t("saveAndRecalculate") : t("save")}
        footerNote={dirty ? t("unsavedRequirements") : null}
      >
        <FormSection id="master-honor-data" title={t("sections.data")}>
          <TranslationsTabsField
            translations={translations}
            onTranslationsChange={(next) => {
              setTranslations(next);
              setDirty(true);
            }}
            includeDescription={false}
            fieldNamePrefix="translations"
            esContent={
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="master-honor-name">{t("fieldName")}</Label>
                  <Input id="master-honor-name" name="name" defaultValue={name} required maxLength={100} />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <Label htmlFor="master-honor-active">{t("fieldActive")}</Label>
                    <p className="text-muted-foreground text-xs">{t("fieldActiveHint")}</p>
                  </div>
                  <Switch
                    id="master-honor-active"
                    checked={active}
                    onCheckedChange={(next) => {
                      setActive(next);
                      setDirty(true);
                    }}
                  />
                </div>
              </div>
            }
          />
          <MasterHonorRulesEditor
            parts={["info"]}
            value={payload}
            onChange={handlePayloadChange}
            honors={honors}
            honorCategories={honorCategories}
            divisions={divisions}
          />
        </FormSection>

        <FormSection id="master-honor-scope" title={t("sections.scope")} description={t("scopeDescription")}>
          <MasterHonorRulesEditor
            parts={["scope"]}
            value={payload}
            onChange={handlePayloadChange}
            honors={honors}
            honorCategories={honorCategories}
            divisions={divisions}
          />
        </FormSection>

        <FormSection id="master-honor-requirements" title={t("sections.requirements")}>
          <p className="text-sm" data-testid="master-honor-groups-summary">
            {activeGroups === 0 ? t("groupsSummaryNone") : t("groupsSummary", { count: activeGroups })}
          </p>
          <MasterHonorRulesEditor
            parts={["groups"]}
            value={payload}
            onChange={handlePayloadChange}
            honors={honors}
            honorCategories={honorCategories}
            divisions={divisions}
            renderGroupSummary={renderGroupSummary}
          />
          {recalculates ? (
            <p role="note" className="rounded-lg bg-warning/10 px-3 py-2 text-sm">
              {t("recalculateWarning")}
            </p>
          ) : null}
        </FormSection>
      </SectionFormPage>
    </form>
  );
}
