"use client";

import Link from "next/link";
import { Eye, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CertificationRow = {
  certification_id: number;
  name: string;
  description?: string | null;
  duration_weeks?: number | null;
  modules_count?: number | null;
  active?: boolean;
};

interface CertificationsListProps {
  items: CertificationRow[];
  /** Base path for detail links. Default: operational certifications module */
  detailBasePath?: string;
}

const HEAD = "h-9 px-3 text-xs font-medium text-muted-foreground";

export function CertificationsList({
  items,
  detailBasePath = "/dashboard/certifications",
}: CertificationsListProps) {
  const t = useTranslations("certifications.list");
  const tTree = useTranslations("certifications.tree");

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t("empty_title")}
        description={t("empty_description")}
      />
    );
  }

  const statusProps = {
    normal: ["active" as const],
    labels: { active: t("status_active"), inactive: t("status_inactive") },
    intents: { inactive: "neutral" as const },
  };

  return (
    <>
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={HEAD}>{t("col_name")}</TableHead>
              <TableHead className={HEAD}>{t("col_duration")}</TableHead>
              <TableHead className={`${HEAD} text-right`}>{t("col_modules")}</TableHead>
              <TableHead className={HEAD}>{t("col_status")}</TableHead>
              <RowActionsHead className="h-9 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((cert) => (
              <TableRow key={cert.certification_id} className="hover:bg-muted/30">
                <TableCell className="max-w-[420px] whitespace-normal px-3 py-2.5 align-middle">
                  <Link
                    href={`${detailBasePath}/${cert.certification_id}`}
                    className="font-medium hover:underline"
                  >
                    {cert.name}
                  </Link>
                  {cert.description ? (
                    <p className="line-clamp-1 text-[13px] text-muted-foreground">
                      {cert.description}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                  {cert.duration_weeks != null
                    ? t("duration_weeks", { count: cert.duration_weeks })
                    : "—"}
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right align-middle text-sm tabular-nums">
                  {cert.modules_count ?? "—"}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <ExceptionStatus
                    value={cert.active !== false ? "active" : "inactive"}
                    {...statusProps}
                  />
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <RowActions
                    label={cert.name}
                    actions={[
                      {
                        label: t("view_detail"),
                        icon: Eye,
                        href: `${detailBasePath}/${cert.certification_id}`,
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <ul className="divide-y rounded-xl bg-card shadow-card md:hidden">
        {items.map((cert) => (
          <li key={cert.certification_id} className="flex items-start gap-2 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`${detailBasePath}/${cert.certification_id}`}
                  className="min-w-0 truncate font-medium hover:underline"
                >
                  {cert.name}
                </Link>
                <ExceptionStatus
                  value={cert.active !== false ? "active" : "inactive"}
                  {...statusProps}
                />
              </div>
              <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                {cert.duration_weeks != null ? (
                  <span>{t("duration_weeks", { count: cert.duration_weeks })}</span>
                ) : null}
                {cert.modules_count != null ? (
                  <span>{tTree("modules_count", { count: cert.modules_count })}</span>
                ) : null}
              </p>
            </div>
            <RowActions
              label={cert.name}
              actions={[
                {
                  label: t("view_detail"),
                  icon: Eye,
                  href: `${detailBasePath}/${cert.certification_id}`,
                },
              ]}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
