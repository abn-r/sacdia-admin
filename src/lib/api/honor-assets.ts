import { apiRequestFromClient } from "@/lib/api/client";
import { readUploadedUrl, type HonorAssetKind } from "@/lib/catalogs/honors/assets";

/** Uploads an honor image or material PDF from the browser and returns its public URL. */
export async function uploadHonorAsset(kind: HonorAssetKind, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const body = await apiRequestFromClient<unknown>("/admin/honors-catalog/assets", {
    method: "POST",
    params: { kind },
    body: formData,
  });
  const url = readUploadedUrl(body);
  if (!url) throw new Error("Upload response without a URL");
  return url;
}
