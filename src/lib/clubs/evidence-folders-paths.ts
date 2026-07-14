export const CLUBS_EVIDENCE_FOLDERS_BASE = "/dashboard/clubs/evidence-folders";

export const CLUBS_EVIDENCE_FOLDERS_TEMPLATES = `${CLUBS_EVIDENCE_FOLDERS_BASE}/templates`;

export function clubsEvidenceFolderPath(folderId: string): string {
  return `${CLUBS_EVIDENCE_FOLDERS_BASE}/${folderId}`;
}
