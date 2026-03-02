import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { HonorImageCell } from "@/components/honors/honor-image-cell";
import { ApiError } from "@/lib/api/client";
import { listClubTypes } from "@/lib/api/catalogs";
import { getHonorById, listHonorCategories } from "@/lib/api/honors";
import { requireAdminUser } from "@/lib/auth/session";

type Params = Promise<{ honorId: string }>;

type GenericRecord = Record<string, unknown>;

const DEFAULT_HONORS_ASSETS_BASE_URL = "https://sacdia-files.s3.us-east-1.amazonaws.com";
const DEFAULT_HONORS_MATERIAL_FOLDER = "Especialidades/Material";

const HONOR_IMAGE_KEYS = [
  "patch_image",
  "patchImage",
  "honor_image",
  "honorImage",
  "image_url",
  "imageUrl",
  "image",
  "image_path",
  "imagePath",
  "patch",
  "patch_url",
  "patchUrl",
  "photo",
  "photo_url",
  "photoUrl",
  "icon",
  "icon_url",
  "iconUrl",
] as const;

const HONOR_MATERIAL_KEYS = [
  "material_url",
  "materialUrl",
  "material_honor",
  "materialHonor",
  "material",
  "pdf",
  "pdf_url",
  "pdfUrl",
] as const;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBaseUrl(baseUrl?: string | null): string | null {
  if (!baseUrl) return null;
  const trimmed = baseUrl.trim();
  if (!trimmed) return null;
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function buildAssetUrlCandidates(
  rawValue: string,
  folder: string,
  missingExtCandidates: string[] = [],
): string[] {
  const normalizedFolder = folder.trim().replace(/^\/+|\/+$/g, "");
  const assetsBaseUrl = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_HONORS_IMAGE_BASE_URL ??
    process.env.NEXT_PUBLIC_FILES_BASE_URL ??
    DEFAULT_HONORS_ASSETS_BASE_URL,
  );

  const candidates: string[] = [];
  const pushCandidate = (candidate?: string | null) => {
    if (!candidate) return;
    const trimmed = candidate.trim();
    if (!trimmed) return;
    if (!candidates.includes(trimmed)) {
      candidates.push(trimmed);
    }
  };

  const buildVariants = (fileName: string): string[] => {
    const hasExtension = /\.[a-z0-9]{2,5}(\?.*)?$/i.test(fileName);
    if (hasExtension || missingExtCandidates.length === 0) {
      return [fileName];
    }
    return [fileName, ...missingExtCandidates.map((ext) => `${fileName}${ext}`)];
  };

  const value = rawValue.trim().replace(/^['"]|['"]$/g, "");
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) {
    if (value.toLowerCase().startsWith("http")) {
      try {
        const url = new URL(value);
        const segments = url.pathname.split("/").filter(Boolean);
        const fileName = segments.at(-1);
        if (fileName && segments.length === 1 && normalizedFolder) {
          const variants = buildVariants(fileName);
          for (const variant of variants) {
            const candidateUrl = new URL(url.toString());
            candidateUrl.pathname = `/${normalizedFolder}/${variant}`;
            pushCandidate(candidateUrl.toString());
          }
        }
      } catch {
        // Si no se puede parsear, usamos valor original.
      }
    }

    pushCandidate(value);
    return candidates;
  }

  if (/^[\w.-]+\.amazonaws\.com\//i.test(value)) {
    pushCandidate(`https://${value}`);
  }

  const path = value.replace(/\\/g, "/").replace(/^\/+/, "");
  const hasSlash = path.includes("/");
  const fileName = path.split("/").filter(Boolean).at(-1) ?? path;
  const variants = buildVariants(fileName);

  if (assetsBaseUrl) {
    if (!hasSlash && normalizedFolder) {
      for (const variant of variants) {
        try {
          pushCandidate(new URL(`${normalizedFolder}/${variant}`, `${assetsBaseUrl}/`).toString());
        } catch {
          // ignoramos URL inválida
        }
      }
    }

    try {
      pushCandidate(new URL(path, `${assetsBaseUrl}/`).toString());
    } catch {
      // ignoramos URL inválida
    }
  }

  pushCandidate(path);
  return candidates;
}

function pickHonorImage(item: GenericRecord): string | null {
  for (const key of HONOR_IMAGE_KEYS) {
    const value = toText(item[key]);
    if (value) return value;
  }
  return null;
}

function pickMaterial(item: GenericRecord): string | null {
  for (const key of HONOR_MATERIAL_KEYS) {
    const value = toText(item[key]);
    if (value) return value;
  }
  return null;
}

function normalizeHonorPayload(payload: unknown): GenericRecord | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const direct = payload as GenericRecord;
  if (typeof direct.honor_id !== "undefined" || typeof direct.name !== "undefined") {
    return direct;
  }

  const data = direct.data;
  if (data && typeof data === "object") {
    return data as GenericRecord;
  }

  return direct;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-[170px] text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? "—"}</span>
    </div>
  );
}

function resolveCategoryName(
  honor: GenericRecord,
  categoryNameById: Map<number, string>,
): string {
  const directNameKeys = [
    "category",
    "category_name",
    "honors_category_name",
    "honor_category_name",
  ] as const;

  for (const key of directNameKeys) {
    const value = honor[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (value && typeof value === "object") {
      const nestedName = toText((value as GenericRecord).name);
      if (nestedName) return nestedName;
    }
  }

  const idCandidates = [
    honor.honors_category_id,
    honor.honor_category_id,
    honor.category_id,
  ];

  for (const candidate of idCandidates) {
    const id = toPositiveNumber(candidate);
    if (!id) continue;
    const name = categoryNameById.get(id);
    if (name) return name;
  }

  return "—";
}

function resolveClubTypeName(honor: GenericRecord, clubTypeNameById: Map<number, string>): string {
  const nestedName = honor.club_type && typeof honor.club_type === "object"
    ? toText((honor.club_type as GenericRecord).name)
    : null;
  if (nestedName) return nestedName;

  const direct = toText(honor.club_type_name);
  if (direct) return direct;

  const id = toPositiveNumber(honor.club_type_id);
  if (!id) return "—";
  return clubTypeNameById.get(id) ?? `#${id}`;
}

export default async function HonorDetailPage({ params }: { params: Params }) {
  await requireAdminUser();

  const { honorId } = await params;
  const parsedHonorId = toPositiveNumber(honorId);
  if (!parsedHonorId) {
    notFound();
  }

  let honor: GenericRecord;
  try {
    const payload = await getHonorById(parsedHonorId) as unknown;
    const normalized = normalizeHonorPayload(payload);
    if (!normalized) {
      notFound();
    }
    honor = normalized;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const [categories, clubTypes] = await Promise.all([
    listHonorCategories().catch(() => []),
    listClubTypes().catch(() => []),
  ]);

  const categoryNameById = new Map<number, string>();
  for (const category of categories) {
    const categoryName = toText(category.name);
    if (!categoryName) continue;

    const honorCategoryId = toPositiveNumber(category.honor_category_id);
    const categoryId = toPositiveNumber(category.category_id);
    if (honorCategoryId) categoryNameById.set(honorCategoryId, categoryName);
    if (categoryId) categoryNameById.set(categoryId, categoryName);
  }

  const clubTypeNameById = new Map<number, string>();
  for (const clubType of clubTypes) {
    const id = toPositiveNumber(clubType.club_type_id);
    const name = toText(clubType.name);
    if (id && name) {
      clubTypeNameById.set(id, name);
    }
  }

  const name = toText(honor.name) ?? toText(honor.title) ?? `Especialidad #${parsedHonorId}`;
  const description = toText(honor.description);
  const image = pickHonorImage(honor);
  const materialRawValue = pickMaterial(honor);
  const materialUrl = materialRawValue
    ? (buildAssetUrlCandidates(materialRawValue, DEFAULT_HONORS_MATERIAL_FOLDER, [".pdf"])[0] ?? materialRawValue)
    : null;
  const categoryName = resolveCategoryName(honor, categoryNameById);
  const clubTypeName = resolveClubTypeName(honor, clubTypeNameById);
  const skillLevel = toPositiveNumber(honor.skill_level ?? honor.skillLevel);
  const requirementsCount = toPositiveNumber(honor.requirements_count ?? honor.requirement_count);
  const honorPrimaryId = toPositiveNumber(honor.honor_id) ?? parsedHonorId;

  return (
    <div className="space-y-6">
      <PageHeader title="Detalle de especialidad">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/honors">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-row items-center justify-start overflow-x-auto pt-6" style={{ gap: '50px' }}>
          {/* Imagen de la especialidad */}
          <HonorImageCell
            name={name}
            rawImage={image}
            showName={false}
            sizeClassName="h-[52px] w-[72px]"
          />


          {/* Nombre y categoría en columna */}
          <div className="shrink-0 space-y-1">
            <h2 className="text-xl font-bold">{name}</h2>
            <p className="text-sm text-muted-foreground">{categoryName}</p>
          </div>

          {/* Badge de estado */}
          <Badge variant={honor.active !== false ? "default" : "outline"} className="shrink-0 w-fit">
            {honor.active !== false ? "Activo" : "Inactivo"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="ID" value={honorPrimaryId} />
          <InfoRow label="Categoría" value={categoryName} />
          <InfoRow label="Tipo de club" value={clubTypeName} />
          <InfoRow label="Nivel" value={skillLevel ?? "—"} />
          <InfoRow label="Requisitos" value={requirementsCount ?? "—"} />
          <InfoRow
            label="Material"
            value={materialUrl ? (
              <div className="flex items-center gap-4">
                <a
                  href={materialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Abrir material
                </a>
                <a
                  href={materialUrl}
                  download
                  className="font-medium text-primary hover:underline"
                >
                  Descargar
                </a>
              </div>
            ) : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Descripción</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {description ?? "Sin descripción registrada."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
