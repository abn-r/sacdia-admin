import { FolderOpen } from "lucide-react";
import { ModuleListPage } from "@/components/shared/module-list-page";

export default function FoldersPage() {
  return (
    <ModuleListPage
      title="Folders — Carpetas de evidencias"
      description="Consulta de carpetas de evidencias."
      endpoint="/folders/folders"
      icon={FolderOpen}
      idKey="folder_id"
      columns={[
        { key: "name", label: "Nombre" },
        { key: "description", label: "Descripción" },
      ]}
    />
  );
}
