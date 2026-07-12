"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { usePanelPath } from "@/lib/v2/panel-path-context";

type PanelDashboardLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export function PanelDashboardLink({ href, ...props }: PanelDashboardLinkProps) {
  const { toPanelPath } = usePanelPath();
  return <Link href={toPanelPath(href)} {...props} />;
}
