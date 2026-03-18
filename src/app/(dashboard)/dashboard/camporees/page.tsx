import { Tent } from "lucide-react";
import { ModuleListPage } from "@/components/shared/module-list-page";

export default function CamporeesPage() {
  return (
    <ModuleListPage
      title="Camporees"
      description="Gestión de camporees y eventos."
      endpoint="/camporees"
      icon={Tent}
      idKey="camporee_id"
      columns={[
        { key: "name", label: "Nombre" },
        { key: "start_date", label: "Fecha inicio" },
        { key: "end_date", label: "Fecha fin" },
        { key: "location", label: "Lugar" },
      ]}
    />
  );
}
