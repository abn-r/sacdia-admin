"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import {
  Banknote,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Landmark,
  MapPin,
  Package,
  Printer,
  ShieldCheck,
  Tag,
  TrendingUp,
  UserRound,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createEmptyMonthlyReportData,
  type MonthlyReportData,
  type MonthlyReportTableRow,
  type YesNoValue,
} from "./monthly-report.types";
import styles from "./monthly-report.module.css";

type FieldValue = string | number | boolean | null | MonthlyReportTableRow[];
type FieldSection = keyof MonthlyReportData;

interface FieldDefinition {
  key: string;
  label: string;
  icon?: LucideIcon;
}

interface TableColumn {
  key: string;
  label: string;
  width: string;
  type?: "date" | "text";
}

const honorsColumns: TableColumn[] = [
  { key: "nombre", label: "Nombre", width: "25%" },
  { key: "categoria", label: "Categoría", width: "17%" },
  { key: "instructor", label: "Instructor", width: "18%" },
  { key: "avance", label: "Avance", width: "20%" },
  { key: "participantes", label: "Participantes", width: "20%" },
];

const activitiesColumns: TableColumn[] = [
  { key: "fecha", label: "Fecha", width: "10%", type: "date" },
  { key: "actividad", label: "Actividad", width: "32%" },
  { key: "lugar", label: "Lugar", width: "18%" },
  { key: "participacion", label: "Participación", width: "20%" },
  { key: "resultado", label: "Resultado", width: "20%" },
];

const financeColumns: TableColumn[] = [
  { key: "fecha", label: "Fecha", width: "15%", type: "date" },
  { key: "concepto", label: "Concepto", width: "35%" },
  { key: "tipo", label: "Tipo", width: "16%" },
  { key: "monto", label: "Monto", width: "16%" },
  { key: "comprobante", label: "Comprobante", width: "18%" },
];

const missionaryColumns: TableColumn[] = [
  { key: "fecha", label: "Fecha", width: "12%", type: "date" },
  { key: "actividad", label: "Actividad", width: "28%" },
  { key: "lugar", label: "Lugar", width: "20%" },
  { key: "participantes", label: "Participantes", width: "20%" },
  { key: "impacto", label: "Impacto", width: "20%" },
];

const serviceColumns: TableColumn[] = [
  { key: "fecha", label: "Fecha", width: "12%", type: "date" },
  { key: "servicioRealizado", label: "Servicio realizado", width: "28%" },
  { key: "beneficiarios", label: "Beneficiarios", width: "20%" },
  { key: "participacion", label: "Participación", width: "20%" },
  { key: "resultado", label: "Resultado", width: "20%" },
];

function inputId(section: string, field: string) {
  return `monthly-report-${section}-${field}`;
}

function emptyRow(columns: TableColumn[]): MonthlyReportTableRow {
  return Object.fromEntries(columns.map((column) => [column.key, ""]));
}

function BrandAsset({
  src,
  alt,
  className,
  warning,
}: {
  src: string;
  alt: string;
  className: string;
  warning: string;
}) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <span className={styles.brandWarning} role="note">
        {warning}
      </span>
    );
  }

  return (
    // The official local asset is deliberately not recreated when it is absent.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => setMissing(true)}
    />
  );
}

function TextField({
  section,
  field,
  label,
  value,
  onChange,
  type = "text",
  prefix,
  suffix,
  compact = false,
}: {
  section: string;
  field: string;
  label: string;
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  type?: "text" | "number" | "email" | "tel" | "date";
  prefix?: string;
  suffix?: string;
  compact?: boolean;
}) {
  const id = inputId(section, field);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (type !== "number") {
      onChange(event.target.value);
      return;
    }

    onChange(event.target.value === "" ? null : event.target.valueAsNumber);
  }

  return (
    <div className={`${styles.field} ${compact ? styles.compactField : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputWrap}>
        {prefix && <span className={styles.inputPrefix} aria-hidden="true">{prefix}</span>}
        <input
          id={id}
          type={type}
          value={value ?? ""}
          onChange={handleChange}
          className={prefix ? styles.hasPrefix : suffix ? styles.hasSuffix : undefined}
          min={type === "number" ? 0 : undefined}
          step={type === "number" ? "any" : undefined}
        />
        {suffix && <span className={styles.inputSuffix} aria-hidden="true">{suffix}</span>}
      </div>
    </div>
  );
}

function TextareaField({
  section,
  field,
  label,
  value,
  onChange,
  className,
  maxLength = 240,
}: {
  section: string;
  field: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  maxLength?: number;
}) {
  const id = inputId(section, field);

  return (
    <div className={`${styles.textareaField} ${className ?? ""}`}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
      />
    </div>
  );
}

function YesNoGroup({
  section,
  field,
  label,
  value,
  onChange,
  icon: Icon,
}: {
  section: string;
  field: string;
  label: string;
  value: YesNoValue;
  onChange: (value: YesNoValue) => void;
  icon: LucideIcon;
}) {
  const yesId = inputId(section, `${field}-yes`);
  const noId = inputId(section, `${field}-no`);

  return (
    <fieldset className={styles.yesNoField} aria-required="true">
      <legend>
        <Icon aria-hidden="true" />
        <span>{label}</span>
      </legend>
      <div className={styles.radioOptions}>
        <span>
          <input
            id={yesId}
            name={`${section}-${field}`}
            type="radio"
            checked={value === true}
            onChange={() => onChange(true)}
          />
          <label htmlFor={yesId}>Sí</label>
        </span>
        <span>
          <input
            id={noId}
            name={`${section}-${field}`}
            type="radio"
            checked={value === false}
            onChange={() => onChange(false)}
          />
          <label htmlFor={noId}>No</label>
        </span>
      </div>
    </fieldset>
  );
}

function Panel({
  title,
  tone = "primary",
  children,
}: {
  title: string;
  tone?: "primary" | "secondary";
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <h3 className={tone === "primary" ? styles.panelHeaderPrimary : styles.panelHeaderSecondary}>
        {title}
      </h3>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

function MetricCard({
  section,
  field,
  label,
  value,
  onChange,
  icon: Icon,
  accent,
  prefix,
  suffix,
}: {
  section: string;
  field: string;
  label: string;
  value: number | null;
  onChange: (value: string | number | null) => void;
  icon: LucideIcon;
  accent: "primary" | "secondary" | "accent" | "info";
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className={`${styles.metricCard} ${styles[`metric${accent[0].toUpperCase()}${accent.slice(1)}`]}`}>
      <Icon aria-hidden="true" />
      <TextField
        section={section}
        field={field}
        label={label}
        value={value}
        onChange={onChange}
        type="number"
        prefix={prefix}
        suffix={suffix}
        compact
      />
    </div>
  );
}

function EditableTable({
  section,
  label,
  rows,
  columns,
  minimumRows,
  onChange,
}: {
  section: string;
  label: string;
  rows: MonthlyReportTableRow[];
  columns: TableColumn[];
  minimumRows: number;
  onChange: (rows: MonthlyReportTableRow[]) => void;
}) {
  const visibleRows = Array.from(
    { length: Math.max(minimumRows, rows.length) },
    (_, index) => rows[index] ?? emptyRow(columns),
  );

  function updateCell(rowIndex: number, columnKey: string, value: string) {
    const nextRows = visibleRows.map((row) => ({ ...row }));
    nextRows[rowIndex][columnKey] = value;
    onChange(nextRows);
  }

  return (
    <table className={styles.reportTable}>
      <caption>{label}</caption>
      <colgroup>
        {columns.map((column) => (
          <col key={column.key} style={{ width: column.width }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col">{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visibleRows.map((row, rowIndex) => (
          <tr key={`${section}-${rowIndex}`}>
            {columns.map((column) => {
              const id = inputId(section, `${rowIndex}-${column.key}`);
              return (
                <td key={column.key}>
                  <label className={styles.srOnly} htmlFor={id}>
                    {`${column.label}, fila ${rowIndex + 1}`}
                  </label>
                  <input
                    id={id}
                    type={column.type ?? "text"}
                    value={row[column.key] ?? ""}
                    maxLength={column.type === "date" ? undefined : 52}
                    onChange={(event) => updateCell(rowIndex, column.key, event.target.value)}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <header className={styles.sectionHeader}>
      <span className={styles.sectionBadge}>{number}</span>
      <h2>{title}</h2>
      <span className={styles.sectionRule} aria-hidden="true" />
    </header>
  );
}

function DocumentFooter() {
  return (
    <footer className={styles.documentFooter}>
      <BrandAsset
        src="/brand/iasd-symbol.svg"
        alt="Símbolo de la Iglesia Adventista del Séptimo Día"
        className={styles.symbolLogo}
        warning="Falta /public/brand/iasd-symbol.svg"
      />
      <div>
        <p>Por la gracia de Dios, formamos jóvenes para servir y transformar.</p>
        <small>Confidencial – Uso interno del club y la iglesia.</small>
      </div>
    </footer>
  );
}

function DocumentHeader({
  page,
  data,
  onChange,
}: {
  page: 1 | 2 | 3;
  data: MonthlyReportData["meta"];
  onChange: (field: string, value: FieldValue) => void;
}) {
  const metaFields: FieldDefinition[] = [
    { key: "distrito", label: "Distrito", icon: MapPin },
    { key: "iglesia", label: "Iglesia", icon: Landmark },
    { key: "nombreClub", label: "Nombre del club", icon: Users },
    { key: "tipoClub", label: "Tipo de club", icon: ShieldCheck },
    { key: "seccion", label: "Sección", icon: Tag },
    { key: "mesAnio", label: "Mes / Año", icon: Calendar },
  ];

  return (
    <header className={styles.documentHeader}>
      <div className={styles.documentTopRow}>
        <BrandAsset
          src="/brand/iasd-logo-horizontal.svg"
          alt="Iglesia Adventista del Séptimo Día"
          className={styles.horizontalLogo}
          warning="Falta /public/brand/iasd-logo-horizontal.svg"
        />
        <div className={styles.documentTitle}>
          <h1>REPORTE MENSUAL</h1>
          <p>Documento de seguimiento mensual</p>
        </div>
        <div className={styles.documentMeta}>
          <TextField
            section={`meta-page-${page}`}
            field="folio"
            label="Folio / Código de reporte"
            value={data.folio}
            onChange={(value) => onChange("folio", value)}
            compact
          />
          <p>{`Página ${page} de 3`}</p>
        </div>
      </div>
      <div className={styles.infoGrid}>
        {metaFields.map(({ key, label, icon: Icon }) => (
          <div key={key} className={styles.infoGridField}>
            {Icon && <Icon aria-hidden="true" />}
            <TextField
              section={`meta-page-${page}`}
              field={key}
              label={label}
              value={data[key as keyof typeof data]}
              onChange={(value) => onChange(key, value)}
              compact
            />
          </div>
        ))}
      </div>
    </header>
  );
}

export function MonthlyReport({ initialData }: { initialData?: MonthlyReportData }) {
  const [data, setData] = useState<MonthlyReportData>(
    () => initialData ?? createEmptyMonthlyReportData(),
  );

  function updateField(section: FieldSection, field: string, value: FieldValue) {
    setData((current) => ({
      ...current,
      [section]: {
        ...(current[section] as Record<string, unknown>),
        [field]: value,
      },
    }) as MonthlyReportData);
  }

  function updateTable(
    section: "ensenanzas" | "actividadesClub" | "finanzas" | "actividadMisionera" | "servicio",
    field: "honores" | "actividades" | "movimientosFinancieros" | "actividadesMisioneras" | "accionesServicio",
    rows: MonthlyReportTableRow[],
  ) {
    updateField(section, field, rows);
  }

  return (
    <main className={styles.monthlyReportRoot} aria-label="Formato de reporte mensual">
      <div className={styles.screenControls}>
        <Button type="button" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Imprimir / Guardar PDF
        </Button>
      </div>

      <form onSubmit={(event) => event.preventDefault()}>
        <div className={styles.pagePreview}>
          <article className={`${styles.documentPage} ${styles.pageOne}`} aria-label="Página 1 de 3">
            <DocumentHeader
              page={1}
              data={data.meta}
              onChange={(field, value) => updateField("meta", field, value)}
            />

            <div className={styles.pageContent}>
              <section className={`${styles.reportSection} ${styles.administrationSection}`}>
                <SectionHeader number={1} title="ADMINISTRACIÓN" />
                <div className={styles.administrationGrid}>
                  <div className={styles.leadershipFields}>
                    {[
                      ["director", "Director(a)"],
                      ["subdirector", "Subdirector(a)"],
                      ["secretario", "Secretario(a)"],
                      ["tesorero", "Tesorero(a)"],
                    ].map(([field, label]) => (
                      <TextField
                        key={field}
                        section="administracion"
                        field={field}
                        label={label}
                        value={data.administracion[field as keyof typeof data.administracion] as string}
                        onChange={(value) => updateField("administracion", field, value)}
                        compact
                      />
                    ))}
                    <TextareaField
                      section="administracion"
                      field="consejeros"
                      label="Consejeros / líderes"
                      value={data.administracion.consejeros}
                      onChange={(value) => updateField("administracion", "consejeros", value)}
                      className={styles.counselorsField}
                      maxLength={260}
                    />
                  </div>
                  <div className={styles.administrationPanels}>
                    <Panel title="Indicadores resumidos">
                      <div className={styles.summaryMetrics}>
                        <MetricCard
                          section="administracion"
                          field="totalMiembros"
                          label="Total de miembros inscritos"
                          value={data.administracion.totalMiembros}
                          onChange={(value) => updateField("administracion", "totalMiembros", value)}
                          icon={Users}
                          accent="primary"
                        />
                        <MetricCard
                          section="administracion"
                          field="asistenciaPromedio"
                          label="Asistencia promedio"
                          value={data.administracion.asistenciaPromedio}
                          onChange={(value) => updateField("administracion", "asistenciaPromedio", value)}
                          icon={UserRound}
                          accent="secondary"
                          suffix="%"
                        />
                        <MetricCard
                          section="administracion"
                          field="reunionesMes"
                          label="Reuniones realizadas en el mes"
                          value={data.administracion.reunionesMes}
                          onChange={(value) => updateField("administracion", "reunionesMes", value)}
                          icon={Calendar}
                          accent="accent"
                        />
                        <MetricCard
                          section="administracion"
                          field="reunionesDirectiva"
                          label="Reuniones de directiva"
                          value={data.administracion.reunionesDirectiva}
                          onChange={(value) => updateField("administracion", "reunionesDirectiva", value)}
                          icon={FileText}
                          accent="info"
                        />
                      </div>
                    </Panel>
                    <Panel title="Indicadores Sí / No" tone="secondary">
                      <div className={styles.yesNoList}>
                        <YesNoGroup section="administracion" field="planificacionMensual" label="Planificación mensual" value={data.administracion.planificacionMensual} onChange={(value) => updateField("administracion", "planificacionMensual", value)} icon={ClipboardList} />
                        <YesNoGroup section="administracion" field="informeATiempo" label="Informe entregado a tiempo" value={data.administracion.informeATiempo} onChange={(value) => updateField("administracion", "informeATiempo", value)} icon={Clock} />
                        <YesNoGroup section="administracion" field="inventarioActualizado" label="Inventario actualizado" value={data.administracion.inventarioActualizado} onChange={(value) => updateField("administracion", "inventarioActualizado", value)} icon={Package} />
                        <YesNoGroup section="administracion" field="documentacionAlDia" label="Documentación al día" value={data.administracion.documentacionAlDia} onChange={(value) => updateField("administracion", "documentacionAlDia", value)} icon={FileText} />
                      </div>
                    </Panel>
                  </div>
                </div>
              </section>

              <section className={`${styles.reportSection} ${styles.teachingsSection}`}>
                <SectionHeader number={2} title="ENSEÑANZAS" />
                <div className={styles.teachingsTextareas}>
                  <TextareaField section="ensenanzas" field="temaEspiritual" label="Tema espiritual del mes" value={data.ensenanzas.temaEspiritual} onChange={(value) => updateField("ensenanzas", "temaEspiritual", value)} maxLength={190} />
                  <TextareaField section="ensenanzas" field="objetivoFormativo" label="Objetivo formativo" value={data.ensenanzas.objetivoFormativo} onChange={(value) => updateField("ensenanzas", "objetivoFormativo", value)} maxLength={190} />
                  <TextareaField section="ensenanzas" field="observacionesEnsenanzas" label="Observaciones" value={data.ensenanzas.observacionesEnsenanzas} onChange={(value) => updateField("ensenanzas", "observacionesEnsenanzas", value)} maxLength={190} />
                </div>
                <EditableTable section="honores" label="Honores / Especialidades / Clases" rows={data.ensenanzas.honores} columns={honorsColumns} minimumRows={5} onChange={(rows) => updateTable("ensenanzas", "honores", rows)} />
              </section>

            </div>
            <DocumentFooter />
          </article>

          <article className={`${styles.documentPage} ${styles.pageTwo}`} aria-label="Página 2 de 3">
            <DocumentHeader
              page={2}
              data={data.meta}
              onChange={(field, value) => updateField("meta", field, value)}
            />

            <div className={styles.pageContent}>
              <section className={`${styles.reportSection} ${styles.activitiesSection}`}>
                <SectionHeader number={3} title="ACTIVIDADES DEL CLUB" />
                <EditableTable section="actividades" label="Actividades realizadas" rows={data.actividadesClub.actividades} columns={activitiesColumns} minimumRows={5} onChange={(rows) => updateTable("actividadesClub", "actividades", rows)} />
                <TextareaField section="actividadesClub" field="descripcionMes" label="Descripción general del mes / Logros relevantes" value={data.actividadesClub.descripcionMes} onChange={(value) => updateField("actividadesClub", "descripcionMes", value)} className={styles.monthDescription} maxLength={240} />
              </section>

              <section className={`${styles.reportSection} ${styles.financesSection}`}>
                <SectionHeader number={4} title="FINANZAS" />
                <div className={styles.financeMetrics}>
                  <MetricCard section="finanzas" field="ingresosMes" label="Ingresos del mes" value={data.finanzas.ingresosMes} onChange={(value) => updateField("finanzas", "ingresosMes", value)} icon={TrendingUp} accent="secondary" prefix="$" />
                  <MetricCard section="finanzas" field="egresosMes" label="Egresos del mes" value={data.finanzas.egresosMes} onChange={(value) => updateField("finanzas", "egresosMes", value)} icon={TrendingUp} accent="primary" prefix="$" />
                  <MetricCard section="finanzas" field="saldoInicial" label="Saldo inicial" value={data.finanzas.saldoInicial} onChange={(value) => updateField("finanzas", "saldoInicial", value)} icon={Banknote} accent="info" prefix="$" />
                  <MetricCard section="finanzas" field="saldoFinal" label="Saldo final" value={data.finanzas.saldoFinal} onChange={(value) => updateField("finanzas", "saldoFinal", value)} icon={Banknote} accent="secondary" prefix="$" />
                </div>
                <div className={styles.splitBody}>
                  <EditableTable section="movimientosFinancieros" label="Detalle financiero" rows={data.finanzas.movimientosFinancieros} columns={financeColumns} minimumRows={7} onChange={(rows) => updateTable("finanzas", "movimientosFinancieros", rows)} />
                  <div className={styles.sideColumn}>
                    <TextareaField section="finanzas" field="observacionesFinancieras" label="Observaciones financieras" value={data.finanzas.observacionesFinancieras} onChange={(value) => updateField("finanzas", "observacionesFinancieras", value)} className={styles.financialObservations} maxLength={220} />
                    <Panel title="Indicadores Sí / No" tone="secondary">
                      <div className={styles.yesNoList}>
                        <YesNoGroup section="finanzas" field="cajaConciliada" label="Caja conciliada" value={data.finanzas.cajaConciliada} onChange={(value) => updateField("finanzas", "cajaConciliada", value)} icon={ClipboardList} />
                        <YesNoGroup section="finanzas" field="comprobantesCompletos" label="Comprobantes completos" value={data.finanzas.comprobantesCompletos} onChange={(value) => updateField("finanzas", "comprobantesCompletos", value)} icon={FileText} />
                        <YesNoGroup section="finanzas" field="informeRevisado" label="Informe revisado" value={data.finanzas.informeRevisado} onChange={(value) => updateField("finanzas", "informeRevisado", value)} icon={FileText} />
                      </div>
                    </Panel>
                  </div>
                </div>
              </section>

            </div>
            <DocumentFooter />
          </article>

          <article className={`${styles.documentPage} ${styles.pageThree}`} aria-label="Página 3 de 3">
            <DocumentHeader
              page={3}
              data={data.meta}
              onChange={(field, value) => updateField("meta", field, value)}
            />

            <div className={styles.pageContent}>

              <section className={`${styles.reportSection} ${styles.missionarySection}`}>
                <SectionHeader number={5} title="ACTIVIDAD MISIONERA" />
                <div className={styles.splitBody}>
                  <EditableTable section="actividadesMisioneras" label="Actividades misioneras" rows={data.actividadMisionera.actividadesMisioneras} columns={missionaryColumns} minimumRows={5} onChange={(rows) => updateTable("actividadMisionera", "actividadesMisioneras", rows)} />
                  <div className={styles.sideColumn}>
                    <TextareaField section="actividadMisionera" field="resumenImpactoMisionero" label="Resumen e impacto misionero" value={data.actividadMisionera.resumenImpactoMisionero} onChange={(value) => updateField("actividadMisionera", "resumenImpactoMisionero", value)} className={styles.compactTextArea} maxLength={190} />
                    <Panel title="Indicadores Sí / No" tone="secondary">
                      <div className={styles.yesNoList}>
                        <YesNoGroup section="actividadMisionera" field="visitasMisioneras" label="Hubo visitas misioneras" value={data.actividadMisionera.visitasMisioneras} onChange={(value) => updateField("actividadMisionera", "visitasMisioneras", value)} icon={Users} />
                        <YesNoGroup section="actividadMisionera" field="literaturaDistribuida" label="Se distribuyó literatura" value={data.actividadMisionera.literaturaDistribuida} onChange={(value) => updateField("actividadMisionera", "literaturaDistribuida", value)} icon={FileText} />
                        <YesNoGroup section="actividadMisionera" field="seguimientoMisionero" label="Se dio seguimiento" value={data.actividadMisionera.seguimientoMisionero} onChange={(value) => updateField("actividadMisionera", "seguimientoMisionero", value)} icon={UserPlus} />
                      </div>
                    </Panel>
                  </div>
                </div>
              </section>

              <section className={`${styles.reportSection} ${styles.serviceSection}`}>
                <SectionHeader number={6} title="SERVICIO" />
                <div className={styles.splitBody}>
                  <EditableTable section="accionesServicio" label="Acciones de servicio" rows={data.servicio.accionesServicio} columns={serviceColumns} minimumRows={5} onChange={(rows) => updateTable("servicio", "accionesServicio", rows)} />
                  <div className={styles.sideColumn}>
                    <TextareaField section="servicio" field="descripcionServicio" label="Descripción del servicio y aprendizajes" value={data.servicio.descripcionServicio} onChange={(value) => updateField("servicio", "descripcionServicio", value)} className={styles.compactTextArea} maxLength={190} />
                    <Panel title="Indicadores Sí / No" tone="secondary">
                      <div className={styles.yesNoList}>
                        <YesNoGroup section="servicio" field="participacionComunitaria" label="Participación comunitaria" value={data.servicio.participacionComunitaria} onChange={(value) => updateField("servicio", "participacionComunitaria", value)} icon={Users} />
                        <YesNoGroup section="servicio" field="trabajoEquipo" label="Trabajo en equipo" value={data.servicio.trabajoEquipo} onChange={(value) => updateField("servicio", "trabajoEquipo", value)} icon={Users} />
                        <YesNoGroup section="servicio" field="evaluacionPositiva" label="Evaluación positiva" value={data.servicio.evaluacionPositiva} onChange={(value) => updateField("servicio", "evaluacionPositiva", value)} icon={CheckCircle2} />
                      </div>
                    </Panel>
                  </div>
                </div>
              </section>

              <section className={`${styles.signaturesSection} ${styles.reportSection}`} aria-label="Firmas">
                <div className={styles.signatureGrid}>
                  <Panel title="Datos del secretario" tone="secondary">
                    <div className={styles.signatureFields}>
                      <TextField section="firmas" field="nombreSecretario" label="Nombre del secretario(a)" value={data.firmas.nombreSecretario} onChange={(value) => updateField("firmas", "nombreSecretario", value)} compact />
                      <TextField section="firmas" field="telefonoSecretario" label="Teléfono" value={data.firmas.telefonoSecretario} onChange={(value) => updateField("firmas", "telefonoSecretario", value)} type="tel" compact />
                      <TextField section="firmas" field="correoSecretario" label="Correo" value={data.firmas.correoSecretario} onChange={(value) => updateField("firmas", "correoSecretario", value)} type="email" compact />
                      <TextField section="firmas" field="fechaEntrega" label="Fecha de entrega" value={data.firmas.fechaEntrega} onChange={(value) => updateField("firmas", "fechaEntrega", value)} type="date" compact />
                      <TextField section="firmas" field="firmaSecretario" label="Firma" value={data.firmas.firmaSecretario} onChange={(value) => updateField("firmas", "firmaSecretario", value)} compact />
                    </div>
                  </Panel>
                  <Panel title="Visto bueno del director(a)" tone="secondary">
                    <div className={styles.signatureFields}>
                      <TextField section="firmas" field="nombreDirectorVoBo" label="Nombre del director(a)" value={data.firmas.nombreDirectorVoBo} onChange={(value) => updateField("firmas", "nombreDirectorVoBo", value)} compact />
                      <TextField section="firmas" field="fechaVoBo" label="Fecha" value={data.firmas.fechaVoBo} onChange={(value) => updateField("firmas", "fechaVoBo", value)} type="date" compact />
                      <TextField section="firmas" field="firmaDirector" label="Firma" value={data.firmas.firmaDirector} onChange={(value) => updateField("firmas", "firmaDirector", value)} compact />
                      <div className={styles.voboMark}>
                        <CheckCircle2 aria-hidden="true" />
                        <span>Validación del director(a)</span>
                      </div>
                    </div>
                  </Panel>
                </div>
              </section>
            </div>
            <DocumentFooter />
          </article>
        </div>
      </form>
    </main>
  );
}
