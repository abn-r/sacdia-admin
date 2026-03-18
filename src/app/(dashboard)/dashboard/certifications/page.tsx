import { ShieldCheck } from "lucide-react";
import { ModuleListPage } from "@/components/shared/module-list-page";

export default function CertificationsPage() {
  return (
    <ModuleListPage
      title="Certificaciones Guías Mayores"
      description="Consulta de certificaciones y progreso."
      endpoint="/certifications/certifications"
      icon={ShieldCheck}
      idKey="certification_id"
      columns={[
        { key: "name", label: "Nombre" },
        { key: "description", label: "Descripción" },
      ]}
    />
  );
}
