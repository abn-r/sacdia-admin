import type { ReactNode } from "react";
import { AnnualFoldersI18nProvider } from "@/components/annual-folders/annual-folders-i18n-provider";

export default function AnnualFoldersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AnnualFoldersI18nProvider>{children}</AnnualFoldersI18nProvider>;
}
