import type { CamporeeEventSection } from "@/lib/api/camporee-events";

/** Official club-section logos shipped in `public/img/logos-secciones/`. */
export const SECTION_LOGO_PUBLIC_BASE = "/img/logos-secciones";

const SECTION_LOGO_FILE: Record<CamporeeEventSection, string> = {
  adventurers: "aventureros.png",
  pathfinders: "conquistadores.png",
  master_guides: "guias-mayores.png",
};

export function resolveSectionLogoSrc(section: CamporeeEventSection): string {
  return `${SECTION_LOGO_PUBLIC_BASE}/${SECTION_LOGO_FILE[section]}`;
}
