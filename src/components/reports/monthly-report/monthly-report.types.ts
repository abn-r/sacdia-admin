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
