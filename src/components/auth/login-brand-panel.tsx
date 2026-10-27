import Image from "next/image";
import { useTranslations } from "next-intl";

export function LoginBrandPanel() {
  const t = useTranslations("auth.login");

  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-sidebar-border bg-sidebar p-12 text-foreground lg:flex">
      <div className="relative flex items-center gap-3">
        <Image
          src="/app-icon.jpg"
          alt="SACDIA"
          width={44}
          height={44}
          className="size-11 rounded-[10px] outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
          priority
        />
        <div className="leading-tight">
          <div className="text-base font-semibold tracking-tight">SACDIA</div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {t("brand_subtitle")}
          </div>
        </div>
      </div>

      <div className="relative max-w-[480px]">
        <div className="mb-5 font-mono text-[11px] text-muted-foreground">
          {t("verse_reference")}
        </div>
        <p className="text-4xl font-semibold leading-[1.18] tracking-tight text-balance">
          {t("verse_text")}
        </p>
        <p className="mt-7 max-w-[420px] border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
          {t("brand_description")}
        </p>
      </div>

      <div className="relative font-mono text-[11px] text-muted-foreground">
        {t("version_label")}
      </div>
    </aside>
  );
}
