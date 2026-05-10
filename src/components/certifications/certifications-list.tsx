"use client";

import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

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
}

export function CertificationsList({ items }: CertificationsListProps) {
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
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("col_name")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("col_description")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("col_duration")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("col_modules")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("col_status")}
            </TableHead>
            <TableHead className="h-9 w-12 px-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((cert) => (
            <TableRow key={cert.certification_id} className="hover:bg-muted/30">
              <TableCell className="px-3 py-2.5 align-middle">
                <span className="font-medium">{cert.name}</span>
              </TableCell>
              <TableCell className="max-w-xs px-3 py-2.5 align-middle">
                <span className="truncate text-sm text-muted-foreground">
                  {cert.description ?? "—"}
                </span>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                {cert.duration_weeks != null
                  ? t("duration_weeks", { count: cert.duration_weeks })
                  : "—"}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                {cert.modules_count ?? "—"}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <Badge variant={cert.active !== false ? "soft-success" : "outline"}>
                  {cert.active !== false ? t("status_active") : t("status_inactive")}
                </Badge>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link href={`/dashboard/certifications/${cert.certification_id}`}>
                    <ChevronRight className="size-4" />
                    <span className="sr-only">{t("view_detail")}</span>
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
