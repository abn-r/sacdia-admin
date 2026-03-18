import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { getSelectOptions } from "@/lib/catalogs/service";
import { CreateClubForm } from "@/components/clubs/create-club-form";
import { createClubAction } from "@/lib/clubs/actions";

export default async function NewClubPage() {
  await requireAdminUser();

  const [localFields, districts, churches] = await Promise.all([
    getSelectOptions("local-fields").catch(() => []),
    getSelectOptions("districts").catch(() => []),
    getSelectOptions("churches").catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Crear club">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/clubs">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
      </PageHeader>

      <CreateClubForm
        localFields={localFields}
        districts={districts}
        churches={churches}
        formAction={createClubAction}
      />
    </div>
  );
}
