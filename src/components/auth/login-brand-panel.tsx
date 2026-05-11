import Image from "next/image";
import { useTranslations } from "next-intl";

export function LoginBrandPanel() {
  const t = useTranslations("auth.login");

  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 p-12 text-primary-foreground lg:flex">
      <svg
        width="700"
        height="700"
        viewBox="0 0 700 700"
        className="pointer-events-none absolute -right-64 -top-48 opacity-[0.18]"
        aria-hidden="true"
      >
        {[80, 160, 240, 320, 400].map((r) => (
          <circle
            key={r}
            cx="350"
            cy="350"
            r={r}
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
        ))}
      </svg>

      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className="pointer-events-none absolute -bottom-16 -left-16 opacity-[0.14]"
        aria-hidden="true"
      >
        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>

      <div className="relative flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl border border-white/30 bg-white/15 backdrop-blur-sm">
          <Image
            src="/svg/LogoSACDIA.svg"
            alt="SACDIA"
            width={24}
            height={24}
            style={{ filter: "brightness(0) invert(1)" }}
            priority
          />
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold tracking-tight">SACDIA</div>
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] opacity-75">
            {t("brand_subtitle")}
          </div>
        </div>
      </div>

      <div className="relative max-w-[480px]">
        <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.14em] text-primary-foreground/75">
          {t("verse_reference")}
        </div>
        <p className="text-4xl font-semibold leading-[1.18] tracking-tight">
          {t("verse_text")}
        </p>
        <p className="mt-7 max-w-[420px] border-t border-white/20 pt-5 text-sm leading-relaxed text-primary-foreground/95">
          {t("brand_description")}
        </p>
      </div>

      <div className="relative flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.06em] opacity-70">
        <span>{t("version_label")}</span>
        <span>{t("region_label")}</span>
      </div>
    </aside>
  );
}
