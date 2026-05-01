import Link from "next/link";
import {
  Globe,
  Building2,
  MapPin,
  Church,
  Map,
  Heart,
  Stethoscope,
  Pill,
  Users,
  CalendarDays,
  Tent,
  Shield,
  Award,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

type CatalogCard = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  colorClass: string;
  readOnly?: boolean;
};

const geographyCards: CatalogCard[] = [
  {
    title: "Países",
    description: "Administrá los países disponibles en el sistema.",
    href: "/dashboard/catalogs/geography/countries",
    icon: Globe,
    colorClass: "bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)] text-[var(--chart-2)]",
  },
  {
    title: "Uniones",
    description: "Gestioná las uniones eclesiásticas registradas.",
    href: "/dashboard/catalogs/geography/unions",
    icon: Building2,
    colorClass: "bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)] text-[var(--chart-2)]",
  },
  {
    title: "Campos locales",
    description: "Configurá los campos locales por unión.",
    href: "/dashboard/catalogs/geography/local-fields",
    icon: MapPin,
    colorClass: "bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)] text-[var(--chart-2)]",
  },
  {
    title: "Distritos",
    description: "Organizá los distritos dentro de cada campo.",
    href: "/dashboard/catalogs/geography/districts",
    icon: Map,
    colorClass: "bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)] text-[var(--chart-2)]",
  },
  {
    title: "Iglesias",
    description: "Gestioná las iglesias asociadas a cada distrito.",
    href: "/dashboard/catalogs/geography/churches",
    icon: Church,
    colorClass: "bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)] text-[var(--chart-2)]",
  },
];

const referenceCards: CatalogCard[] = [
  {
    title: "Alergias",
    description: "Listado de alergias para el perfil de salud de los miembros.",
    href: "/dashboard/catalogs/allergies",
    icon: Heart,
    colorClass: "bg-[color-mix(in_oklch,var(--chart-4)_12%,transparent)] text-[var(--chart-4)]",
  },
  {
    title: "Enfermedades",
    description: "Enfermedades crónicas o condiciones médicas relevantes.",
    href: "/dashboard/catalogs/diseases",
    icon: Stethoscope,
    colorClass: "bg-[color-mix(in_oklch,var(--chart-4)_12%,transparent)] text-[var(--chart-4)]",
  },
  {
    title: "Medicamentos",
    description: "Medicamentos de uso habitual para los miembros.",
    href: "/dashboard/catalogs/medicines",
    icon: Pill,
    colorClass: "bg-[color-mix(in_oklch,var(--chart-4)_12%,transparent)] text-[var(--chart-4)]",
  },
  {
    title: "Tipos de relación",
    description: "Vínculos familiares o de contacto de emergencia.",
    href: "/dashboard/catalogs/relationship-types",
    icon: Users,
    colorClass: "bg-[color-mix(in_oklch,var(--chart-3)_14%,transparent)] text-[var(--chart-3)]",
  },
  {
    title: "Años eclesiásticos",
    description: "Períodos anuales para la organización de actividades.",
    href: "/dashboard/catalogs/ecclesiastical-years",
    icon: CalendarDays,
    colorClass: "bg-[color-mix(in_oklch,var(--chart-3)_14%,transparent)] text-[var(--chart-3)]",
  },
  {
    title: "Tipos de club",
    description: "Tipos de club disponibles en el sistema.",
    href: "/dashboard/catalogs/club-types",
    icon: Tent,
    colorClass: "bg-[color-mix(in_oklch,var(--chart-3)_14%,transparent)] text-[var(--chart-3)]",
    readOnly: true,
  },
  {
    title: "Ideales de club",
    description: "Ideales asociados a cada tipo de club.",
    href: "/dashboard/catalogs/club-ideals",
    icon: Shield,
    colorClass: "bg-[color-mix(in_oklch,var(--chart-3)_14%,transparent)] text-[var(--chart-3)]",
    readOnly: true,
  },
  {
    title: "Categorías de especialidades",
    description: "Categorías para clasificar el catálogo de especialidades.",
    href: "/dashboard/catalogs/honor-categories",
    icon: Award,
    colorClass: "bg-primary/10 text-primary",
  },
];

function SectionHeader({
  title,
  icon: Icon,
}: {
  title: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

function CatalogGrid({
  sectionTitle,
  sectionIcon,
  cards,
}: {
  sectionTitle: string;
  sectionIcon: React.ElementType;
  cards: CatalogCard[];
}) {
  return (
    <div>
      <SectionHeader title={sectionTitle} icon={sectionIcon} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group">
            <div
              className={cn(
                "rounded-xl border border-border/60 bg-card p-4",
                "hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      card.colorClass
                    )}
                  >
                    <card.icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm leading-tight">
                        {card.title}
                      </span>
                      {card.readOnly && (
                        <Badge variant="secondary" className="text-xs py-0">
                          Solo lectura
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {card.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 translate-x-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 mt-0.5" />
              </div>
            </div>
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
      <CatalogGrid
        sectionTitle="Geografía"
        sectionIcon={Globe}
        cards={geographyCards}
      />
      <CatalogGrid
        sectionTitle="Datos de referencia"
        sectionIcon={BookOpen}
        cards={referenceCards}
      />
    </div>
  );
}
