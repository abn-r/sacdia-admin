"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations as useTranslationsStrict } from "next-intl";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { PageHeader } from "@/components/shared/page-header";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import type {
  BulkClubRow,
  BulkClubsImportResult,
} from "@/lib/clubs/bulk-import-actions";
import {
  type CatalogOption,
  decodeCsv,
  isCsvFile,
  matchCatalogName,
  normalizeName,
} from "@/lib/clubs/bulk-import-parse";
import {
  checkClubsImportFile,
  exceedsClubsImportRows,
  pageSlice,
  rowsForReviewTab,
} from "@/lib/clubs/import-review";

type LooseTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

// The `clubs.pages.import.validation.*` messages take dynamic values; the
// strict typing cannot follow them, so this wizard reads them loosely.
const useTranslations = useTranslationsStrict as unknown as (
  namespace?: string,
) => LooseTranslator;

type ParsedRow = {
  rowNumber: number;
  name: string;
  localFieldRaw: string;
  districtRaw: string;
  churchRaw: string;
  description?: string;
  address?: string;
  latitudeRaw?: string;
  longitudeRaw?: string;
  local_field_id?: number;
  district_id?: number;
  church_id?: number;
  coordinates?: { lat: number; lng: number };
  errors: string[];
};

type Props = {
  localFields: CatalogOption[];
  districts: CatalogOption[];
  churches: CatalogOption[];
  submitAction: (rows: BulkClubRow[]) => Promise<BulkClubsImportResult>;
};

const EXPECTED_HEADERS = [
  "name",
  "local_field",
  "district",
  "church",
  "description",
  "address",
  "latitude",
  "longitude",
] as const;

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function parseCoord(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function ClubsBulkImport({
  localFields,
  districts,
  churches,
  submitAction,
}: Props) {
  const t = useTranslations("clubs.pages.import");
  const tc = useTranslations("people.clubs");
  const tList = useTranslations("clubs.pages.list");
  const tSteps = useTranslations("shared.kit.steps");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkClubsImportResult | null>(null);
  // Rows left out of the import because the file had errors in them.
  const [skipped, setSkipped] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [resultPage, setResultPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]!);
  const [isPending, startTransition] = useTransition();
  const tabParam = useUrlTab("tab", "errors");

  const validRows = useMemo(() => rows.filter((row) => row.errors.length === 0), [rows]);
  const invalidRows = useMemo(() => rows.filter((row) => row.errors.length > 0), [rows]);

  // Archivo -> Revisar -> Resultado, derived from what the wizard holds.
  const step = result ? 3 : rows.length > 0 ? 2 : 1;
  const stepTitle =
    step === 1 ? tc("import.stepFile") : step === 2 ? tc("import.stepReview") : tc("import.stepResult");
  const stepline = tSteps("stepline", { current: step, total: 3, title: stepTitle });
  const description = step === 2 && fileName ? `${stepline} · ${fileName}` : stepline;

  function resetState() {
    setRows([]);
    setParseError(null);
    setResult(null);
    setFileName(null);
    setSkipped(0);
    setReviewPage(1);
    setResultPage(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function validateRow(row: ParsedRow): string[] {
    const errors: string[] = [];

    if (!row.name) errors.push(t("validation.missingName"));

    const localField = matchCatalogName(row.localFieldRaw, localFields);
    if (localField.ok) {
      row.local_field_id = localField.id;
    } else if (localField.reason === "missing") {
      errors.push(t("validation.missingLocalField"));
    } else {
      errors.push(t("validation.unknownLocalField", { value: row.localFieldRaw }));
    }

    const district = matchCatalogName(row.districtRaw, districts, row.local_field_id);
    if (district.ok) {
      row.district_id = district.id;
    } else if (district.reason === "missing") {
      errors.push(t("validation.missingDistrict"));
    } else if (district.reason === "outsideParent") {
      errors.push(
        t("validation.districtOutsideLocalField", {
          value: row.districtRaw,
          parent: row.localFieldRaw,
        }),
      );
    } else {
      errors.push(t("validation.unknownDistrict", { value: row.districtRaw }));
    }

    const church = matchCatalogName(row.churchRaw, churches, row.district_id);
    if (church.ok) {
      row.church_id = church.id;
    } else if (church.reason === "missing") {
      errors.push(t("validation.missingChurch"));
    } else if (church.reason === "outsideParent") {
      errors.push(
        t("validation.churchOutsideDistrict", {
          value: row.churchRaw,
          parent: row.districtRaw,
        }),
      );
    } else {
      errors.push(t("validation.unknownChurch", { value: row.churchRaw }));
    }

    const lat = parseCoord(row.latitudeRaw);
    const lng = parseCoord(row.longitudeRaw);
    if ((row.latitudeRaw || row.longitudeRaw) && (lat === undefined || lng === undefined)) {
      errors.push(t("validation.coordinatesInvalid"));
    } else if (lat !== undefined && lng !== undefined) {
      row.coordinates = { lat, lng };
    }

    return errors;
  }

  async function handleFile(file: File) {
    setResult(null);
    setParseError(null);
    setRows([]);
    setReviewPage(1);
    setFileName(file.name);

    const check = checkClubsImportFile(file);
    if (!check.ok) {
      setParseError(check.reason === "size" ? tc("import.errors.fileTooLarge") : tc("import.errors.fileType"));
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      // SheetJS reads CSV bytes as Latin-1, which breaks UTF-8 accents.
      const workbook = isCsvFile(file)
        ? XLSX.read(decodeCsv(buffer), { type: "string" })
        : XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setParseError(t("errors.emptyWorkbook"));
        return;
      }
      const sheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      }) as Record<string, unknown>[];

      if (json.length === 0) {
        setParseError(t("errors.noRows"));
        return;
      }
      if (exceedsClubsImportRows(json.length)) {
        setParseError(tc("import.errors.tooManyRows", { total: json.length }));
        return;
      }

      const headerCheck = Object.keys(json[0] ?? {}).map((h) => normalizeName(h));
      const required = ["name", "local_field", "district", "church"];
      const missing = required.filter((h) => !headerCheck.includes(h));
      if (missing.length > 0) {
        setParseError(t("errors.missingHeaders", { headers: missing.join(", ") }));
        return;
      }

      const parsed: ParsedRow[] = json.map((raw, idx) => {
        const getValue = (key: string) => {
          const found = Object.entries(raw).find(([k]) => normalizeName(k) === key);
          return found ? String(found[1] ?? "").trim() : "";
        };

        const row: ParsedRow = {
          rowNumber: idx + 2,
          name: getValue("name"),
          localFieldRaw: getValue("local_field"),
          districtRaw: getValue("district"),
          churchRaw: getValue("church"),
          description: getValue("description") || undefined,
          address: getValue("address") || undefined,
          latitudeRaw: getValue("latitude") || undefined,
          longitudeRaw: getValue("longitude") || undefined,
          errors: [],
        };
        row.errors = validateRow(row);
        return row;
      });

      setRows(parsed);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : t("errors.parseFailed"));
    }
  }

  function handleSubmit() {
    if (validRows.length === 0) return;

    const payload: BulkClubRow[] = validRows.map((row) => ({
      rowNumber: row.rowNumber,
      name: row.name,
      local_field_id: row.local_field_id!,
      district_id: row.district_id!,
      church_id: row.church_id!,
      description: row.description,
      address: row.address,
      coordinates: row.coordinates,
    }));

    startTransition(async () => {
      const res = await submitAction(payload);
      setSkipped(invalidRows.length);
      setResultPage(1);
      setResult(res);
      if (res.created > 0) {
        // The rows are imported: drop the preview so they can't be sent twice.
        setRows([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      }
    });
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const sample: Record<string, string> = {
      name: "Club Ejemplo",
      local_field: localFields[0]?.label ?? "",
      district: districts[0]?.label ?? "",
      church: churches[0]?.label ?? "",
      description: "",
      address: "",
      latitude: "",
      longitude: "",
    };
    const ws = XLSX.utils.json_to_sheet([sample], { header: [...EXPECTED_HEADERS] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "clubs");
    XLSX.writeFile(wb, "clubs-template.xlsx");
  }

  const header = (
    <PageHeader
      breadcrumbs={[
        { label: tList("title"), href: "/dashboard/clubs" },
        { label: tc("import.crumb") },
      ]}
      title={tc("import.heading")}
      description={description}
    />
  );

  // Hidden in every step so «Elegir otro archivo» can reopen the picker.
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".xlsx,.xls,.csv"
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void handleFile(file);
      }}
    />
  );

  // ─── Step 1 · Archivo ────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="space-y-6">
        {header}
        <section className="max-w-2xl space-y-4 rounded-xl bg-card p-6 shadow-card">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight">{tc("import.fileHeading")}</h2>
            <p className="text-sm text-muted-foreground">{tc("import.limits")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              <Upload className="size-4" />
              {t("chooseFile")}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                void downloadTemplate();
              }}
            >
              <Download className="size-4" />
              {t("downloadTemplate")}
            </Button>
            {fileName && parseError ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileSpreadsheet className="size-4" />
                {fileName}
              </span>
            ) : null}
          </div>
          {fileInput}

          {parseError ? (
            <p role="alert" className="text-sm text-destructive">
              {parseError}
            </p>
          ) : null}

          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t("expectedHeadersTitle")}</p>
            <p>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                name, local_field, district, church, description, address, latitude, longitude
              </code>
            </p>
            <p>{t("matchHint")}</p>
          </div>
        </section>
      </div>
    );
  }

  // ─── Step 2 · Revisar ────────────────────────────────────────────────────────
  if (step === 2) {
    const view = rowsForReviewTab(rows, tabParam);
    const totalPages = Math.max(1, Math.ceil(view.rows.length / pageSize));
    const page = Math.min(reviewPage, totalPages);
    const visible = pageSlice(view.rows, page, pageSize);

    const reviewCell = (row: ParsedRow) =>
      row.errors.length > 0 ? (
        <ul className="space-y-0.5 text-[13px] text-destructive">
          {row.errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      ) : (
        <span className="text-[13px] text-muted-foreground">{tc("import.rowReady")}</span>
      );

    return (
      <div className="space-y-6">
        {header}
        {fileInput}

        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {tc("import.reviewSummary", {
              total: rows.length,
              ready: validRows.length,
              invalid: invalidRows.length,
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {invalidRows.length > 0 ? tc("import.reviewHint") : tc("import.reviewAllReady")}
          </p>
        </div>

        {invalidRows.length > 0 ? (
          <UrlTabs
            ariaLabel={tc("import.reviewTabs")}
            defaultValue="errors"
            tabs={[
              { value: "errors", label: tc("import.tabErrors"), count: invalidRows.length },
              { value: "all", label: tc("import.tabAll"), count: rows.length },
            ]}
          />
        ) : null}

        <DataTableShell className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] pl-5">#</TableHead>
                <TableHead>{t("colName")}</TableHead>
                <TableHead>{t("colLocalField")}</TableHead>
                <TableHead>{t("colDistrict")}</TableHead>
                <TableHead>{t("colChurch")}</TableHead>
                <TableHead>{tc("import.colReview")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow
                  key={row.rowNumber}
                  data-state={row.errors.length > 0 ? "selected" : undefined}
                >
                  <TableCell className="pl-5 text-muted-foreground tabular-nums">
                    {row.rowNumber}
                  </TableCell>
                  <TableCell className="font-medium whitespace-normal">{row.name || "—"}</TableCell>
                  <TableCell className="text-sm whitespace-normal">{row.localFieldRaw || "—"}</TableCell>
                  <TableCell className="text-sm whitespace-normal">{row.districtRaw || "—"}</TableCell>
                  <TableCell className="text-sm whitespace-normal">{row.churchRaw || "—"}</TableCell>
                  <TableCell className="min-w-48 whitespace-normal">{reviewCell(row)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>

        <DataTableShell className="md:hidden">
          <ul className="divide-y">
            {visible.map((row) => (
              <li
                key={row.rowNumber}
                data-state={row.errors.length > 0 ? "selected" : undefined}
                className="space-y-1 px-4 py-3 data-[state=selected]:bg-muted"
              >
                <p className="flex items-baseline gap-2 text-sm font-medium">
                  <span className="text-xs font-normal text-muted-foreground tabular-nums">
                    {row.rowNumber}
                  </span>
                  <span className="min-w-0 truncate">{row.name || "—"}</span>
                </p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {[row.districtRaw, row.churchRaw].filter(Boolean).join(" · ") || "—"}
                </p>
                {reviewCell(row)}
              </li>
            ))}
          </ul>
        </DataTableShell>

        <DataTablePagination
          page={page}
          totalPages={totalPages}
          total={view.rows.length}
          limit={pageSize}
          limitOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setReviewPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setReviewPage(1);
          }}
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={resetState}
            disabled={isPending}
          >
            {tc("import.chooseAnother")}
          </Button>
          <Button loading={isPending} onClick={handleSubmit} disabled={validRows.length === 0}>
            {t("submitButton", { count: validRows.length })}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Step 3 · Resultado ──────────────────────────────────────────────────────
  const outcome = result!;
  const totalPages = Math.max(1, Math.ceil(outcome.results.length / pageSize));
  const page = Math.min(resultPage, totalPages);
  const visibleResults = pageSlice(outcome.results, page, pageSize);

  return (
    <div className="space-y-6">
      {header}
      {fileInput}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          {outcome.forbidden ? (
            <p className="text-sm font-semibold">{t("resultForbidden")}</p>
          ) : (
            <>
              <p className="text-sm font-semibold">
                {tc("import.resultCreated", { count: outcome.created })}
              </p>
              <p className="text-sm text-muted-foreground">
                {[
                  outcome.failed > 0 ? tc("import.resultFailed", { count: outcome.failed }) : null,
                  skipped > 0 ? tc("import.resultSkipped", { count: skipped }) : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rows.length > 0 ? (
            <Button type="button" variant="outline" onClick={() => setResult(null)}>
              {tc("import.backToReview")}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={resetState}>
              {tc("import.importAnother")}
            </Button>
          )}
          <Button asChild>
            <Link href="/dashboard/clubs">{tc("import.goToClubs")}</Link>
          </Button>
        </div>
      </div>

      {outcome.results.length > 0 ? (
        <>
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] pl-5">#</TableHead>
                  <TableHead>{t("colName")}</TableHead>
                  <TableHead>{tc("import.colResult")}</TableHead>
                  <TableHead>
                    <span className="sr-only">{tc("import.colOpen")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleResults.map((res) => (
                  <TableRow key={res.rowNumber} data-state={res.ok ? undefined : "selected"}>
                    <TableCell className="pl-5 text-muted-foreground tabular-nums">
                      {res.rowNumber}
                    </TableCell>
                    <TableCell className="font-medium whitespace-normal">{res.name || "—"}</TableCell>
                    <TableCell className="text-sm whitespace-normal">
                      {res.ok ? (
                        t("rowCreated")
                      ) : (
                        <span className="text-destructive">{res.message ?? t("rowFailed")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {res.ok && res.clubId ? (
                        <Link
                          href={`/dashboard/clubs/${res.clubId}`}
                          className="text-sm text-primary underline-offset-4 hover:underline"
                        >
                          {t("openClub", { id: res.clubId })}
                        </Link>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
          <DataTablePagination
            page={page}
            totalPages={totalPages}
            total={outcome.results.length}
            limit={pageSize}
            limitOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setResultPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setResultPage(1);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
