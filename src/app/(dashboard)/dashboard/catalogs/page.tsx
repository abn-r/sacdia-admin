import Link from "next/link";
import {
  Globe,
  Building,
  MapPin,
  Church,
  Map,
  Heart,
  Stethoscope,
  Link2,
  CalendarDays,
  Tent,
  Star,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";

type CatalogCard = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
};

const geographyCards: CatalogCard[] = [
  { title: "Países", description: "Gestión de países", href: "/dashboard/catalogs/geography/countries", icon: Globe },
  { title: "Uniones", description: "Gestión de uniones", href: "/dashboard/catalogs/geography/unions", icon: Building },
  { title: "Campos locales", description: "Gestión de campos locales", href: "/dashboard/catalogs/geography/local-fields", icon: MapPin },
  { title: "Distritos", description: "Gestión de distritos", href: "/dashboard/catalogs/geography/districts", icon: Map },
  { title: "Iglesias", description: "Gestión de iglesias", href: "/dashboard/catalogs/geography/churches", icon: Church },
];

const referenceCards: CatalogCard[] = [
  { title: "Alergias", description: "Catálogo de alergias", href: "/dashboard/catalogs/allergies", icon: Heart },
  { title: "Enfermedades", description: "Catálogo de enfermedades", href: "/dashboard/catalogs/diseases", icon: Stethoscope },
  { title: "Tipos de relación", description: "Tipos de relación familiar", href: "/dashboard/catalogs/relationship-types", icon: Link2 },
  { title: "Años eclesiásticos", description: "Períodos anuales", href: "/dashboard/catalogs/ecclesiastical-years", icon: CalendarDays },
  { title: "Tipos de club", description: "Tipos de club disponibles", href: "/dashboard/catalogs/club-types", icon: Tent },
  { title: "Ideales de club", description: "Ideales por tipo de club", href: "/dashboard/catalogs/club-ideals", icon: Star },
];

function CatalogGrid({ title, cards }: { title: string; cards: CatalogCard[] }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <card.icon className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">{card.title}</CardTitle>
                  <CardDescription className="text-xs">{card.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function CatalogsPage() {
  await requireAdminUser();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Catálogos"
        description="Gestión de datos de referencia del sistema."
      />
      <CatalogGrid title="Geografía" cards={geographyCards} />
      <CatalogGrid title="Datos de referencia" cards={referenceCards} />
    </div>
  );
}
