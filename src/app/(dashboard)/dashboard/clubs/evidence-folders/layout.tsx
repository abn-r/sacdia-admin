import type { ReactNode } from "react";
import { AnnualFoldersI18nProvider } from "@/components/annual-folders/annual-folders-i18n-provider";

export default function ClubsEvidenceFoldersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AnnualFoldersI18nProvider>{children}</AnnualFoldersI18nProvider>;
}
