import { Award } from "lucide-react";
import { ModuleListPage } from "@/components/shared/module-list-page";

export default function HonorsPage() {
  return (
    <ModuleListPage
      title="Honores"
      description="Catálogo de honores y especialidades."
      endpoint="/honors"
      icon={Award}
      idKey="honor_id"
      columns={[
        { key: "name", label: "Nombre" },
        { key: "category", label: "Categoría" },
      ]}
    />
  );
}
