"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { SettingsRow, SettingsSaveBar, SettingsSection } from "@/components/shared/settings-rows";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { updateSystemConfig, type SystemConfig } from "@/lib/api/system-config";
import {
  controlFor,
  diffVariables,
  groupVariables,
  humanizePrefix,
  invalidVariables,
  isTruthyValue,
  type VariableErrorCode,
} from "@/lib/system-config/variables";

interface VariablesFormProps {
  initialConfigs: SystemConfig[];
}

/**
 * Global variables as settings: one section per key prefix, the control of each
 * value type and a single save bar that sends only what changed.
 */
export function VariablesForm({ initialConfigs }: VariablesFormProps) {
  const t = useTranslations("admin.configuration.variables");
  const tGroups = useTranslations("system_config.groups");
  const [configs, setConfigs] = useState(initialConfigs);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const groups = useMemo(() => groupVariables(configs), [configs]);
  const changes = useMemo(() => diffVariables(configs, drafts), [configs, drafts]);
  const errors = useMemo(() => invalidVariables(configs, drafts), [configs, drafts]);
  const dirty = changes.length > 0;

  function groupTitle(prefix: string) {
    return tGroups.has(prefix as Parameters<typeof tGroups>[0])
      ? tGroups(prefix as Parameters<typeof tGroups>[0])
      : humanizePrefix(prefix);
  }

  function setDraft(key: string, value: string) {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  }

  function errorText(code: VariableErrorCode | undefined) {
    return showErrors && code ? t(`errors.${code}`) : null;
  }

  async function save() {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      toast.error(t("invalid"));
      return;
    }
    setPending(true);
    const results = await Promise.allSettled(
      changes.map((change) => updateSystemConfig(change.key, { config_value: change.value })),
    );
    const saved = changes.filter((_, index) => results[index]?.status === "fulfilled");
    const failed = results.flatMap((result, index) =>
      result.status === "rejected" ? [{ key: changes[index]?.key ?? "", reason: result.reason }] : [],
    );

    if (saved.length > 0) {
      const savedMap = new Map(saved.map((change) => [change.key, change.value]));
      setConfigs((prev) =>
        prev.map((config) =>
          savedMap.has(config.config_key)
            ? { ...config, config_value: savedMap.get(config.config_key) ?? config.config_value }
            : config,
        ),
      );
      setDrafts((prev) => {
        const next = { ...prev };
        for (const change of saved) delete next[change.key];
        return next;
      });
      toast.success(t("saved", { count: saved.length }));
    }
    if (failed.length > 0) {
      const first = failed[0]?.reason;
      toast.error(
        t("saveFailed", {
          keys: failed.map((item) => item.key).join(", "),
          detail: first instanceof ApiError ? first.message : t("unexpected"),
        }),
      );
    }
    setShowErrors(false);
    setPending(false);
  }

  function cancel() {
    setDrafts({});
    setShowErrors(false);
  }

  return (
    <div>
      {groups.map((group) => (
        <SettingsSection
          key={group.prefix}
          title={groupTitle(group.prefix)}
          description={group.prefix === "general" ? undefined : `${group.prefix}.*`}
        >
          {group.configs.map((config) => {
            const key = config.config_key;
            const control = controlFor(config.value_type);
            const value = drafts[key] ?? config.config_value;
            const error = errorText(errors[key]);
            const inputId = `variable-${key}`;
            const label = config.description?.trim() ? config.description : key;

            return (
              <SettingsRow
                key={key}
                label={<label htmlFor={inputId}>{label}</label>}
                description={
                  <>
                    <code className="font-mono text-xs">{key}</code>
                    {error ? (
                      <span role="alert" className="mt-1 block text-destructive">
                        {error}
                      </span>
                    ) : null}
                  </>
                }
                control={
                  control === "boolean" ? (
                    <Switch
                      id={inputId}
                      checked={isTruthyValue(value)}
                      onCheckedChange={(checked) => setDraft(key, checked ? "true" : "false")}
                      disabled={pending}
                    />
                  ) : control === "number" ? (
                    <Input
                      id={inputId}
                      type="number"
                      inputMode="decimal"
                      className="w-28"
                      value={value}
                      onChange={(event) => setDraft(key, event.target.value)}
                      aria-invalid={Boolean(error)}
                      disabled={pending}
                    />
                  ) : control === "json" ? (
                    <Textarea
                      id={inputId}
                      rows={4}
                      spellCheck={false}
                      className="w-full font-mono text-xs sm:w-80"
                      value={value}
                      onChange={(event) => setDraft(key, event.target.value)}
                      aria-invalid={Boolean(error)}
                      disabled={pending}
                    />
                  ) : (
                    <Input
                      id={inputId}
                      className="w-full sm:w-64"
                      value={value}
                      onChange={(event) => setDraft(key, event.target.value)}
                      aria-invalid={Boolean(error)}
                      disabled={pending}
                    />
                  )
                }
              />
            );
          })}
        </SettingsSection>
      ))}
      <SettingsSaveBar dirty={dirty} pending={pending} onSave={save} onCancel={cancel} />
    </div>
  );
}
