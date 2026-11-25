import Image from "next/image";
import { useTranslations } from "next-intl";
import { ACCESS_LOGO_SRC } from "@/components/auth/public-auth-parts";

export function LoginBrandPanel() {
  const t = useTranslations("auth.login");
  const tAccess = useTranslations("admin.access.login");

  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-sidebar-border bg-sidebar p-12 text-foreground lg:flex">
      <div className="relative flex items-center gap-3">
        <Image
          src={ACCESS_LOGO_SRC}
          alt="SACDIA"
          width={44}
          height={44}
          className="size-11 rounded-[10px]"
          priority
        />
        <div className="leading-tight">
          <div className="text-base font-semibold tracking-tight">SACDIA</div>
          <div className="font-mono text-2xs text-muted-foreground">
            {t("brand_subtitle")}
          </div>
        </div>
      </div>

      <div className="relative max-w-[480px]">
        <div className="mb-5 font-mono text-2xs text-muted-foreground">
          {t("verse_reference")}
        </div>
        <p className="text-4xl font-semibold leading-[1.18] tracking-tight text-balance">
          {t("verse_text")}
        </p>
        <p className="mt-7 max-w-[420px] border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
          {tAccess("brandDescription")}
        </p>
      </div>

      <div className="relative font-mono text-2xs text-muted-foreground">
        {t("version_label")}
      </div>
    </aside>
  );
}
