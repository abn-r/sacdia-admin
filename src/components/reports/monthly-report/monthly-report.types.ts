export type YesNoValue = boolean | null;

export type MonthlyReportTableRow = Record<string, string>;

export interface MonthlyReportData {
  meta: {
    folio: string;
    distrito: string;
    iglesia: string;
    nombreClub: string;
    tipoClub: string;
    seccion: string;
    mesAnio: string;
  };
  administracion: {
    director: string;
    subdirector: string;
    secretario: string;
    tesorero: string;
    consejeros: string;
    totalMiembros: number | null;
    asistenciaPromedio: number | null;
    reunionesMes: number | null;
    reunionesDirectiva: number | null;
    planificacionMensual: YesNoValue;
    informeATiempo: YesNoValue;
    inventarioActualizado: YesNoValue;
    documentacionAlDia: YesNoValue;
  };
  ensenanzas: {
    temaEspiritual: string;
    objetivoFormativo: string;
    observacionesEnsenanzas: string;
    honores: MonthlyReportTableRow[];
  };
  actividadesClub: {
    actividades: MonthlyReportTableRow[];
    descripcionMes: string;
  };
  finanzas: {
    ingresosMes: number | null;
    egresosMes: number | null;
    saldoInicial: number | null;
    saldoFinal: number | null;
    movimientosFinancieros: MonthlyReportTableRow[];
    observacionesFinancieras: string;
    cajaConciliada: YesNoValue;
    comprobantesCompletos: YesNoValue;
    informeRevisado: YesNoValue;
  };
  actividadMisionera: {
    actividadesMisioneras: MonthlyReportTableRow[];
    resumenImpactoMisionero: string;
    visitasMisioneras: YesNoValue;
    literaturaDistribuida: YesNoValue;
    seguimientoMisionero: YesNoValue;
  };
  servicio: {
    accionesServicio: MonthlyReportTableRow[];
    descripcionServicio: string;
    participacionComunitaria: YesNoValue;
    trabajoEquipo: YesNoValue;
    evaluacionPositiva: YesNoValue;
  };
  firmas: {
    nombreSecretario: string;
    telefonoSecretario: string;
    correoSecretario: string;
    fechaEntrega: string;
    firmaSecretario: string;
    nombreDirectorVoBo: string;
    fechaVoBo: string;
    firmaDirector: string;
  };
}

/**
 * Creates the blank, editable state requested for the monthly-report preview.
 * Table rows are intentionally added by the presentation component so the
 * model remains suitable for persisting only user-entered rows later on.
 */
export function createEmptyMonthlyReportData(): MonthlyReportData {
  return {
    meta: {
      folio: "",
      distrito: "",
      iglesia: "",
      nombreClub: "",
      tipoClub: "",
      seccion: "",
      mesAnio: "",
    },
    administracion: {
      director: "",
      subdirector: "",
      secretario: "",
      tesorero: "",
      consejeros: "",
      totalMiembros: null,
      asistenciaPromedio: null,
      reunionesMes: null,
      reunionesDirectiva: null,
      planificacionMensual: null,
      informeATiempo: null,
      inventarioActualizado: null,
      documentacionAlDia: null,
    },
    ensenanzas: {
      temaEspiritual: "",
      objetivoFormativo: "",
      observacionesEnsenanzas: "",
      honores: [],
    },
    actividadesClub: {
      actividades: [],
      descripcionMes: "",
    },
    finanzas: {
      ingresosMes: null,
      egresosMes: null,
      saldoInicial: null,
      saldoFinal: null,
      movimientosFinancieros: [],
      observacionesFinancieras: "",
      cajaConciliada: null,
      comprobantesCompletos: null,
      informeRevisado: null,
    },
    actividadMisionera: {
      actividadesMisioneras: [],
      resumenImpactoMisionero: "",
      visitasMisioneras: null,
      literaturaDistribuida: null,
      seguimientoMisionero: null,
    },
    servicio: {
      accionesServicio: [],
      descripcionServicio: "",
      participacionComunitaria: null,
      trabajoEquipo: null,
      evaluacionPositiva: null,
    },
    firmas: {
      nombreSecretario: "",
      telefonoSecretario: "",
      correoSecretario: "",
      fechaEntrega: "",
      firmaSecretario: "",
      nombreDirectorVoBo: "",
      fechaVoBo: "",
      firmaDirector: "",
    },
  };
}

/**
 * Provides a realistic, local-only example for visual and print validation.
 * It intentionally follows the presentation model rather than the backend DTO.
 */
export function createExampleMonthlyReportData(): MonthlyReportData {
  return {
    meta: {
      folio: "RM-2026-08-014",
      distrito: "Distrito Central",
      iglesia: "Iglesia Central",
      nombreClub: "Club Centinelas del Valle",
      tipoClub: "Conquistadores",
      seccion: "Sección A",
      mesAnio: "Agosto 2026",
    },
    administracion: {
      director: "Daniel Hernández",
      subdirector: "Laura Méndez",
      secretario: "Mariana López",
      tesorero: "Carlos Ramírez",
      consejeros: "Ana Torres, José Castillo, Rebeca Silva y Samuel Ortega.",
      totalMiembros: 42,
      asistenciaPromedio: 88,
      reunionesMes: 4,
      reunionesDirectiva: 2,
      planificacionMensual: true,
      informeATiempo: true,
      inventarioActualizado: true,
      documentacionAlDia: false,
    },
    ensenanzas: {
      temaEspiritual: "Servicio con propósito y compasión.",
      objetivoFormativo: "Fortalecer liderazgo, trabajo en equipo y disciplina.",
      observacionesEnsenanzas: "Se reforzará orientación y nudos durante septiembre.",
      honores: [
        {
          nombre: "Primeros auxilios",
          categoria: "Salud",
          instructor: "Laura Méndez",
          avance: "Completado",
          participantes: "18",
        },
        {
          nombre: "Campismo I",
          categoria: "Recreación",
          instructor: "José Castillo",
          avance: "75 %",
          participantes: "24",
        },
      ],
    },
    actividadesClub: {
      actividades: [
        {
          fecha: "2026-08-03",
          actividad: "Reunión regular",
          lugar: "Iglesia Central",
          participacion: "38 miembros",
          resultado: "Plan completado",
        },
        {
          fecha: "2026-08-17",
          actividad: "Caminata ecológica",
          lugar: "Parque Metropolitano",
          participacion: "34 miembros",
          resultado: "Ruta completada",
        },
      ],
      descripcionMes: "El club mantuvo asistencia constante y completó las actividades previstas sin incidentes.",
    },
    finanzas: {
      ingresosMes: 12850,
      egresosMes: 8460,
      saldoInicial: 7350,
      saldoFinal: 11740,
      movimientosFinancieros: [
        {
          fecha: "2026-08-02",
          concepto: "Cuotas mensuales",
          tipo: "Ingreso",
          monto: "$8,400",
          comprobante: "REC-0826-01",
        },
        {
          fecha: "2026-08-10",
          concepto: "Material de clases",
          tipo: "Egreso",
          monto: "$3,260",
          comprobante: "FAC-1048",
        },
        {
          fecha: "2026-08-22",
          concepto: "Transporte de actividad",
          tipo: "Egreso",
          monto: "$2,800",
          comprobante: "FAC-1092",
        },
      ],
      observacionesFinancieras: "Todos los comprobantes fueron conciliados con el libro de tesorería.",
      cajaConciliada: true,
      comprobantesCompletos: true,
      informeRevisado: true,
    },
    actividadMisionera: {
      actividadesMisioneras: [
        {
          fecha: "2026-08-09",
          actividad: "Campaña de recolección",
          lugar: "Colonia Centro",
          participantes: "26",
          impacto: "85 familias",
        },
        {
          fecha: "2026-08-24",
          actividad: "Entrega de literatura",
          lugar: "Plaza principal",
          participantes: "18",
          impacto: "120 ejemplares",
        },
      ],
      resumenImpactoMisionero: "Las familias contactadas solicitaron una segunda jornada de apoyo comunitario.",
      visitasMisioneras: true,
      literaturaDistribuida: true,
      seguimientoMisionero: true,
    },
    servicio: {
      accionesServicio: [
        {
          fecha: "2026-08-30",
          servicioRealizado: "Visita al asilo municipal",
          beneficiarios: "32 residentes",
          participacion: "30 miembros",
          resultado: "Jornada completada",
        },
      ],
      descripcionServicio: "Se realizaron dinámicas, limpieza de áreas comunes y entrega de artículos de higiene.",
      participacionComunitaria: true,
      trabajoEquipo: true,
      evaluacionPositiva: true,
    },
    firmas: {
      nombreSecretario: "Mariana López",
      telefonoSecretario: "+52 55 1234 5678",
      correoSecretario: "secretaria@centinelas.example",
      fechaEntrega: "2026-09-03",
      firmaSecretario: "Mariana López",
      nombreDirectorVoBo: "Daniel Hernández",
      fechaVoBo: "2026-09-04",
      firmaDirector: "Daniel Hernández",
    },
  };
}
