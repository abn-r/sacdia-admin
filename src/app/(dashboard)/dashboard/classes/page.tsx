import { GraduationCap } from "lucide-react";
import { ModuleListPage } from "@/components/shared/module-list-page";
import { listClubTypes } from "@/lib/api/catalogs";

export default async function ClassesPage() {
  const clubTypeNameById = new Map<number, string>();

  try {
    const clubTypes = await listClubTypes();
    for (const clubType of clubTypes) {
      if (typeof clubType.club_type_id === "number" && typeof clubType.name === "string" && clubType.name.trim()) {
        clubTypeNameById.set(clubType.club_type_id, clubType.name.trim());
      }
    }
  } catch {
    // Si el endpoint de catálogos no está disponible, mostramos fallback por ID.
  }

  return (
    <ModuleListPage
      title="Clases progresivas"
      description="Catálogo de clases progresivas del sistema."
      endpoint="/classes"
      icon={GraduationCap}
      idKey="class_id"
      columns={[
        { key: "name", label: "Nombre" },
        { key: "description", label: "Descripción" },
        {
          key: "club_type_id",
          label: "Tipo de club",
          format: (value) => {
            const clubTypeId = typeof value === "number" ? value : Number(value);
            if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) return "—";
            return clubTypeNameById.get(clubTypeId) ?? `#${clubTypeId}`;
          },
        },
      ]}
    />
  );
}
