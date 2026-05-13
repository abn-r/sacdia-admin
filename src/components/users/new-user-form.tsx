"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createAdminUserFromClient,
  type AdminCreatableRole,
} from "@/lib/api/admin-users";
import {
  listCountries,
  listUnions,
  listLocalFields,
  type Country,
  type Union,
  type LocalField,
} from "@/lib/api/geography";
import { useRoleLabel } from "@/lib/auth/role-labels";
import { ApiError } from "@/lib/api/client";

// ─── Role ordering (highest to lowest) ───────────────────────────────────────

const ALL_CREATABLE_ROLES: AdminCreatableRole[] = [
  "admin",
  "director-dia",
  "assistant-dia",
  "director-union",
  "assistant-union",
  "director-lf",
  "assistant-lf",
  "general-coordinator",
  "zone-coordinator",
  "coordinator",
  "pastor",
  "user",
];

// ─── Schema ───────────────────────────────────────────────────────────────────

type NewUserTranslator = ReturnType<typeof useTranslations<"users.pages.new">>;

function buildSchema(t: NewUserTranslator) {
  return z.object({
    name: z
      .string()
      .min(1, t("validation.nameRequired"))
      .max(50),
    paternal_last_name: z
      .string()
      .min(1, t("validation.paternalRequired"))
      .max(50),
    maternal_last_name: z
      .string()
      .max(50)
      .optional(),
    email: z
      .string()
      .min(1, t("validation.emailRequired"))
      .max(120)
      .email(t("validation.emailInvalid")),
    role: z
      .string()
      .min(1, t("validation.roleRequired")) as z.ZodType<AdminCreatableRole>,
    country_id: z.coerce
      .number({ error: t("validation.countryRequired") })
      .min(1, t("validation.countryRequired")),
    union_id: z.coerce
      .number({ error: t("validation.unionRequired") })
      .min(1, t("validation.unionRequired")),
    local_field_id: z.coerce.number().min(1).optional(),
  });
}

type FormValues = {
  name: string;
  paternal_last_name: string;
  maternal_last_name?: string;
  email: string;
  role: AdminCreatableRole;
  country_id: number;
  union_id: number;
  local_field_id?: number;
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NewUserFormProps {
  allowedRoles: AdminCreatableRole[];
}

// ─── Component ────────────────────────────────────────────────────────────────

const LIST_HREF = "/dashboard/users";

export function NewUserForm({ allowedRoles }: NewUserFormProps) {
  const t = useTranslations("users.pages.new");
  const router = useRouter();
  const getRoleLabel = useRoleLabel();

  // Geography state
  const [countries, setCountries] = useState<Country[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [localFields, setLocalFields] = useState<LocalField[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingUnions, setLoadingUnions] = useState(false);
  const [loadingLocalFields, setLoadingLocalFields] = useState(false);

  // Schema is stable given t doesn't change after mount
  const schema = useMemo(() => buildSchema(t), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      paternal_last_name: "",
      maternal_last_name: "",
      email: "",
      role: undefined,
      country_id: undefined,
      union_id: undefined,
      local_field_id: undefined,
    },
  });

  const { formState: { isSubmitting } } = form;

  // Load countries on mount
  useEffect(() => {
    setLoadingCountries(true);
    listCountries()
      .then((data) => setCountries(Array.isArray(data) ? data : []))
      .catch(() => toast.error(t("toast.generic")))
      .finally(() => setLoadingCountries(false));
  }, [t]);

  // Watch country_id and load unions when it changes
  const watchedCountryId = form.watch("country_id");
  useEffect(() => {
    if (!watchedCountryId || watchedCountryId < 1) {
      setUnions([]);
      setLocalFields([]);
      form.setValue("union_id", undefined as unknown as number);
      form.setValue("local_field_id", undefined);
      return;
    }

    setLoadingUnions(true);
    setUnions([]);
    setLocalFields([]);
    form.setValue("union_id", undefined as unknown as number);
    form.setValue("local_field_id", undefined);

    listUnions(watchedCountryId)
      .then((data) => setUnions(Array.isArray(data) ? data : []))
      .catch(() => toast.error(t("toast.generic")))
      .finally(() => setLoadingUnions(false));
  }, [watchedCountryId, form, t]);

  // Watch union_id and load local fields when it changes
  const watchedUnionId = form.watch("union_id");
  useEffect(() => {
    if (!watchedUnionId || watchedUnionId < 1) {
      setLocalFields([]);
      form.setValue("local_field_id", undefined);
      return;
    }

    setLoadingLocalFields(true);
    setLocalFields([]);
    form.setValue("local_field_id", undefined);

    listLocalFields(watchedUnionId)
      .then((data) => setLocalFields(Array.isArray(data) ? data : []))
      .catch(() => toast.error(t("toast.generic")))
      .finally(() => setLoadingLocalFields(false));
  }, [watchedUnionId, form, t]);

  async function onSubmit(values: FormValues) {
    try {
      const result = await createAdminUserFromClient({
        name: values.name,
        paternal_last_name: values.paternal_last_name,
        maternal_last_name: values.maternal_last_name || undefined,
        email: values.email,
        role: values.role,
        country_id: values.country_id,
        union_id: values.union_id,
        local_field_id: values.local_field_id,
      });

      toast.success(t("toast.success", { email: result.email }));

      if (!result.invite_email_sent) {
        toast.warning(t("toast.inviteNotSent"));
      }

      router.push(LIST_HREF);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          toast.error(t("toast.emailExists"));
        } else if (error.status === 403) {
          toast.error(t("toast.forbidden"));
        } else if (error.status === 400) {
          toast.error(t("toast.validationFailed"));
        } else {
          toast.error(t("toast.generic"));
        }
      } else {
        toast.error(t("toast.generic"));
      }
    }
  }

  // Filter and order roles according to allowedRoles prop
  const roleOptions = ALL_CREATABLE_ROLES.filter((r) => allowedRoles.includes(r));

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
        noValidate
      >
        {/* ── Grid fields ── */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("fields.name")}{" "}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("placeholders.name")}
                    autoComplete="given-name"
                    maxLength={50}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Paternal last name */}
          <FormField
            control={form.control}
            name="paternal_last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("fields.paternal_last_name")}{" "}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("placeholders.paternal_last_name")}
                    autoComplete="family-name"
                    maxLength={50}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Maternal last name */}
          <FormField
            control={form.control}
            name="maternal_last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.maternal_last_name")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder={t("placeholders.maternal_last_name")}
                    maxLength={50}
                  />
                </FormControl>
                <FormDescription>{t("help.maternal_last_name")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("fields.email")}{" "}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder={t("placeholders.email")}
                    autoComplete="email"
                    maxLength={120}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Role */}
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("fields.role")}{" "}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("placeholders.role")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>{t("help.role")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Country */}
          <FormField
            control={form.control}
            name="country_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("fields.country")}{" "}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </FormLabel>
                {loadingCountries ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("placeholders.country")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.country_id} value={String(c.country_id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Union */}
          <FormField
            control={form.control}
            name="union_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("fields.union")}{" "}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </FormLabel>
                {loadingUnions ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value ? String(field.value) : ""}
                    disabled={!watchedCountryId || watchedCountryId < 1}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("placeholders.union")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {unions.map((u) => (
                        <SelectItem key={u.union_id} value={String(u.union_id)}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!watchedCountryId && (
                  <FormDescription>{t("help.union")}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Local field */}
          <FormField
            control={form.control}
            name="local_field_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.local_field")}</FormLabel>
                {loadingLocalFields ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select
                    onValueChange={(val) =>
                      field.onChange(val ? Number(val) : undefined)
                    }
                    value={field.value ? String(field.value) : ""}
                    disabled={!watchedUnionId || watchedUnionId < 1}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("placeholders.local_field")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {localFields.map((lf) => (
                        <SelectItem
                          key={lf.local_field_id}
                          value={String(lf.local_field_id)}
                        >
                          {lf.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!watchedUnionId && (
                  <FormDescription>{t("help.local_field")}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button variant="outline" asChild>
            <Link href={LIST_HREF}>{t("actions.cancel")}</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? t("actions.submitting") : t("actions.submit")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
