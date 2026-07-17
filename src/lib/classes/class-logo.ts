const ASSET_CODE_PATTERN = /^(AV|CQ|GM)-\d{2}$/;

/** Static class logos shipped with sacdia-admin (`public/img/logos-clases/`). */
export const CLASS_LOGO_PUBLIC_BASE = "/img/logos-clases";

/** Fallback when API omits asset_code (mirrors sacdia-app AppColors.classLogoAsset). */
const CLASS_NAME_TO_ASSET_CODE: Record<string, string> = {
  Corderitos: "AV-01",
  "Aves Madrugadoras": "AV-02",
  "Abejitas Industriosas": "AV-03",
  "Rayos de Sol": "AV-04",
  Constructores: "AV-05",
  "Manos Ayudadoras": "AV-06",
  Amigo: "CQ-01",
  Compañero: "CQ-02",
  Explorador: "CQ-03",
  Orientador: "CQ-04",
  Viajero: "CQ-05",
  Guía: "CQ-06",
  "Guía Mayor": "GM-01",
  "Guía Avanzado": "GM-02",
  "Guía Instructor": "GM-03",
};

function normalizeAssetCode(assetCode?: string | null): string | null {
  const normalized = assetCode?.trim().toUpperCase();
  if (!normalized || !ASSET_CODE_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

export function resolveClassLogoSrc(
  assetCode?: string | null,
  className?: string | null,
): string | null {
  const fromApi = normalizeAssetCode(assetCode);
  if (fromApi) {
    return `${CLASS_LOGO_PUBLIC_BASE}/${fromApi}.png`;
  }

  const fromName =
    className && CLASS_NAME_TO_ASSET_CODE[className.trim()]
      ? CLASS_NAME_TO_ASSET_CODE[className.trim()]
      : null;

  if (fromName) {
    return `${CLASS_LOGO_PUBLIC_BASE}/${fromName}.png`;
  }

  return null;
}
