"use client";

import Link from "next/link";
import { ChevronRight, GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ClassStatusBadge } from "@/components/classes/class-status-badge";

export type ClassRow = {
  class_id: number;
  name: string;
  description?: string | null;
  club_type_id: number;
  club_type_name: string;
  display_order: number;
  modules_count: number;
  active: boolean;
};

interface ClassesListProps {
  items: ClassRow[];
}

export function ClassesList({ items }: ClassesListProps) {
  const t = useTranslations("classes.list");

  if (items.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
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
            <TableHead className="h-9 w-16 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("col_order")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("col_name")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("col_club_type")}
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
          {items.map((cls) => (
            <TableRow key={cls.class_id} className="hover:bg-muted/30">
              <TableCell className="px-3 py-2.5 align-middle tabular-nums text-sm text-muted-foreground">
                {cls.display_order}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <div className="flex flex-col">
                  <span className="font-medium">{cls.name}</span>
                  {cls.description && (
                    <span className="max-w-xs truncate text-xs text-muted-foreground">
                      {cls.description}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <Badge variant="secondary">{cls.club_type_name}</Badge>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                {cls.modules_count > 0 ? cls.modules_count : "—"}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <ClassStatusBadge active={cls.active} />
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link href={`/dashboard/classes/${cls.class_id}`}>
                    <ChevronRight className="size-4" />
                    <span className="sr-only">{t("view_detail", { name: cls.name })}</span>
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
