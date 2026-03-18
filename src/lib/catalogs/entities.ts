export type FieldType = "text" | "textarea" | "number" | "date" | "checkbox" | "select";

export type EntityField = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  optionsEntityKey?: EntityKey;
};

export type EntityConfig = {
  key: EntityKey;
  title: string;
  singularTitle: string;
  description: string;
  routeBase: string;
  listEndpoint: string;
  adminEndpoint: string;
  allowMutations?: boolean;
  idField: string;
  nameField: string;
  fields: EntityField[];
  parentFilter?: {
    entityKey: EntityKey;
    fieldName: string;
    queryParam: string;
    label: string;
  };
};

export const ENTITY_KEYS = [
  "countries",
  "unions",
  "local-fields",
  "districts",
  "churches",
  "relationship-types",
  "allergies",
  "diseases",
  "ecclesiastical-years",
  "club-types",
  "club-ideals",
] as const;

export type EntityKey = (typeof ENTITY_KEYS)[number];

export const entityConfigs: Record<EntityKey, EntityConfig> = {
  countries: {
    key: "countries",
    title: "Países",
    singularTitle: "País",
    description: "Gestión del catálogo de países.",
    routeBase: "/dashboard/catalogs/geography/countries",
    listEndpoint: "/admin/countries",
    adminEndpoint: "/admin/countries",
    idField: "country_id",
    nameField: "name",
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "abbreviation", label: "Abreviatura", type: "text", required: true, placeholder: "MX" },
      { name: "active", label: "Activo", type: "checkbox", required: false },
    ],
  },
  unions: {
    key: "unions",
    title: "Uniones",
    singularTitle: "Unión",
    description: "Gestión de uniones por país.",
    routeBase: "/dashboard/catalogs/geography/unions",
    listEndpoint: "/admin/unions",
    adminEndpoint: "/admin/unions",
    idField: "union_id",
    nameField: "name",
    parentFilter: {
      entityKey: "countries",
      fieldName: "country_id",
      queryParam: "countryId",
      label: "País",
    },
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "abbreviation", label: "Abreviatura", type: "text", required: true, placeholder: "UMN" },
      { name: "country_id", label: "País", type: "select", required: true, optionsEntityKey: "countries" },
      { name: "active", label: "Activo", type: "checkbox", required: false },
    ],
  },
  "local-fields": {
    key: "local-fields",
    title: "Campos Locales",
    singularTitle: "Campo Local",
    description: "Gestión de campos locales por unión.",
    routeBase: "/dashboard/catalogs/geography/local-fields",
    listEndpoint: "/admin/local-fields",
    adminEndpoint: "/admin/local-fields",
    idField: "local_field_id",
    nameField: "name",
    parentFilter: {
      entityKey: "unions",
      fieldName: "union_id",
      queryParam: "unionId",
      label: "Unión",
    },
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "abbreviation", label: "Abreviatura", type: "text", required: true, placeholder: "CN" },
      { name: "union_id", label: "Unión", type: "select", required: true, optionsEntityKey: "unions" },
      { name: "active", label: "Activo", type: "checkbox", required: false },
    ],
  },
  districts: {
    key: "districts",
    title: "Distritos",
    singularTitle: "Distrito",
    description: "Gestión de distritos por campo local.",
    routeBase: "/dashboard/catalogs/geography/districts",
    listEndpoint: "/admin/districts",
    adminEndpoint: "/admin/districts",
    idField: "district_id",
    nameField: "name",
    parentFilter: {
      entityKey: "local-fields",
      fieldName: "local_field_id",
      queryParam: "localFieldId",
      label: "Campo Local",
    },
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      {
        name: "local_field_id",
        label: "Campo Local",
        type: "select",
        required: true,
        optionsEntityKey: "local-fields",
      },
      { name: "active", label: "Activo", type: "checkbox", required: false },
    ],
  },
  churches: {
    key: "churches",
    title: "Iglesias",
    singularTitle: "Iglesia",
    description: "Gestión de iglesias por distrito.",
    routeBase: "/dashboard/catalogs/geography/churches",
    listEndpoint: "/admin/churches",
    adminEndpoint: "/admin/churches",
    idField: "church_id",
    nameField: "name",
    parentFilter: {
      entityKey: "districts",
      fieldName: "district_id",
      queryParam: "districtId",
      label: "Distrito",
    },
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "district_id", label: "Distrito", type: "select", required: true, optionsEntityKey: "districts" },
      { name: "active", label: "Activo", type: "checkbox", required: false },
    ],
  },
  "relationship-types": {
    key: "relationship-types",
    title: "Tipos de Relación",
    singularTitle: "Tipo de Relación",
    description: "Catálogo de tipos de relación para contactos de emergencia y tutores.",
    routeBase: "/dashboard/catalogs/relationship-types",
    listEndpoint: "/admin/relationship-types",
    adminEndpoint: "/admin/relationship-types",
    idField: "relationship_type_id",
    nameField: "name",
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "description", label: "Descripción", type: "textarea" },
      { name: "active", label: "Activo", type: "checkbox", required: false },
    ],
  },
  allergies: {
    key: "allergies",
    title: "Alergias",
    singularTitle: "Alergia",
    description: "Catálogo de alergias para post-registro.",
    routeBase: "/dashboard/catalogs/allergies",
    listEndpoint: "/admin/allergies",
    adminEndpoint: "/admin/allergies",
    idField: "allergy_id",
    nameField: "name",
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "description", label: "Descripción", type: "textarea" },
      { name: "active", label: "Activo", type: "checkbox", required: false },
    ],
  },
  diseases: {
    key: "diseases",
    title: "Enfermedades",
    singularTitle: "Enfermedad",
    description: "Catálogo de enfermedades para post-registro.",
    routeBase: "/dashboard/catalogs/diseases",
    listEndpoint: "/admin/diseases",
    adminEndpoint: "/admin/diseases",
    idField: "disease_id",
    nameField: "name",
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "description", label: "Descripción", type: "textarea" },
      { name: "active", label: "Activo", type: "checkbox", required: false },
    ],
  },
  "ecclesiastical-years": {
    key: "ecclesiastical-years",
    title: "Años Eclesiásticos",
    singularTitle: "Año Eclesiástico",
    description: "Gestión de períodos eclesiásticos.",
    routeBase: "/dashboard/catalogs/ecclesiastical-years",
    listEndpoint: "/admin/ecclesiastical-years",
    adminEndpoint: "/admin/ecclesiastical-years",
    idField: "year_id",
    nameField: "year_id",
    fields: [
      { name: "start_date", label: "Fecha inicio", type: "date", required: true },
      { name: "end_date", label: "Fecha fin", type: "date", required: true },
      { name: "active", label: "Activo", type: "checkbox", required: false },
    ],
  },
  "club-types": {
    key: "club-types",
    title: "Tipos de Club",
    singularTitle: "Tipo de Club",
    description: "Catálogo de tipos de club.",
    routeBase: "/dashboard/catalogs/club-types",
    listEndpoint: "/catalogs/club-types",
    adminEndpoint: "/catalogs/club-types",
    allowMutations: false,
    idField: "club_type_id",
    nameField: "name",
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "active", label: "Activo", type: "checkbox", required: false },
    ],
  },
  "club-ideals": {
    key: "club-ideals",
    title: "Ideales de Club",
    singularTitle: "Ideal de Club",
    description: "Gestión de ideales por tipo de club.",
    routeBase: "/dashboard/catalogs/club-ideals",
    listEndpoint: "/admin/club-ideals",
    adminEndpoint: "/admin/club-ideals",
    allowMutations: false,
    idField: "club_ideal_id",
    nameField: "name",
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "description", label: "Descripción", type: "textarea" },
      {
        name: "club_type_id",
        label: "Tipo de club",
        type: "select",
        required: true,
        optionsEntityKey: "club-types",
      },
      { name: "active", label: "Activo", type: "checkbox", required: false },
    ],
  },
};

export function getEntityConfig(entityKey: string) {
  if (!ENTITY_KEYS.includes(entityKey as EntityKey)) {
    return null;
  }

  return entityConfigs[entityKey as EntityKey];
}
