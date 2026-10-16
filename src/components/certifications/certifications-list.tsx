"use client";

import Link from "next/link";
import { Eye, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";

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

export function CertificationsList({
  items,
  detailBasePath = "/dashboard/certifications",
}: CertificationsListProps) {
  const t = useTranslations("certifications.list");

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t("empty_title")}
        description={t("empty_description")}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
              {t("col_name")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
              {t("col_description")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
              {t("col_duration")}
            </TableHead>
            <TableHead className="hidden xl:table-cell h-9 px-3 text-xs font-medium text-muted-foreground">
              {t("col_modules")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
              {t("col_status")}
            </TableHead>
            <RowActionsHead className="h-9 px-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((cert) => (
            <TableRow key={cert.certification_id} className="hover:bg-muted/30">
              <TableCell className="px-3 py-2.5 align-middle">
                <Link
                  href={`${detailBasePath}/${cert.certification_id}`}
                  className="font-medium hover:underline"
                >
                  {cert.name}
                </Link>
              </TableCell>
              <TableCell className="max-w-[320px] whitespace-normal px-3 py-2.5 align-middle">
                <span className="line-clamp-3 text-sm text-muted-foreground">
                  {cert.description ?? "—"}
                </span>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                {cert.duration_weeks != null
                  ? t("duration_weeks", { count: cert.duration_weeks })
                  : "—"}
              </TableCell>
              <TableCell className="hidden xl:table-cell px-3 py-2.5 align-middle text-sm tabular-nums">
                {cert.modules_count ?? "—"}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <StatusBadge intent={flagStatusIntent(cert.active !== false)} label={cert.active !== false ? t("status_active") : t("status_inactive")} />
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
    </div>
  );
}
