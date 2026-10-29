"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations as useTranslationsStrict } from "next-intl";

type LooseTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const useTranslations = useTranslationsStrict as unknown as (
  namespace?: string,
) => LooseTranslator;
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DataTableShell } from "@/components/shared/data-table-shell";
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
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkClubsImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const validRows = useMemo(
    () => rows.filter((row) => row.errors.length === 0),
    [rows],
  );
  const invalidRows = useMemo(
    () => rows.filter((row) => row.errors.length > 0),
    [rows],
  );

  function resetState() {
    setRows([]);
    setParseError(null);
    setResult(null);
    setFileName(null);
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
    setFileName(file.name);

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

      const headerCheck = Object.keys(json[0] ?? {}).map((h) => normalizeName(h));
      const required = ["name", "local_field", "district", "church"];
      const missing = required.filter((h) => !headerCheck.includes(h));
      if (missing.length > 0) {
        setParseError(t("errors.missingHeaders", { headers: missing.join(", ") }));
        return;
      }

      const parsed: ParsedRow[] = json.map((raw, idx) => {
        const getValue = (key: string) => {
          const found = Object.entries(raw).find(
            ([k]) => normalizeName(k) === key,
          );
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
      setParseError(
        error instanceof Error ? error.message : t("errors.parseFailed"),
      );
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
      setResult(res);
      if (res.created > 0) {
        // The rows are imported: drop the preview so they can't be sent twice.
        setRows([]);
        setFileName(null);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("uploadCardTitle")}</CardTitle>
          <CardDescription>{t("uploadCardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                void downloadTemplate();
              }}
            >
              <Download className="size-4" />
              {t("downloadTemplate")}
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              <Upload className="size-4" />
              {t("chooseFile")}
            </Button>
            {fileName && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileSpreadsheet className="size-4" />
                {fileName}
              </span>
            )}
            {rows.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={resetState}
                disabled={isPending}
              >
                {t("reset")}
              </Button>
            )}
          </div>

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

          <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{t("expectedHeadersTitle")}</p>
            <p className="mt-1">
              <code className="rounded bg-background px-1.5 py-0.5">
                name, local_field, district, church, description, address, latitude, longitude
              </code>
            </p>
            <p className="mt-2">{t("matchHint")}</p>
          </div>

          {parseError && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {parseError}
            </div>
          )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("previewTitle", { total: rows.length })}
            </CardTitle>
            <CardDescription>
              {t("previewSummary", {
                valid: validRows.length,
                invalid: invalidRows.length,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>{t("colName")}</TableHead>
                    <TableHead>{t("colLocalField")}</TableHead>
                    <TableHead>{t("colDistrict")}</TableHead>
                    <TableHead>{t("colChurch")}</TableHead>
                    <TableHead>{t("colStatus")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const isValid = row.errors.length === 0;
                    return (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="text-muted-foreground">
                          {row.rowNumber}
                        </TableCell>
                        <TableCell className="font-medium">{row.name || "—"}</TableCell>
                        <TableCell className="text-sm">{row.localFieldRaw || "—"}</TableCell>
                        <TableCell className="text-sm">{row.districtRaw || "—"}</TableCell>
                        <TableCell className="text-sm">{row.churchRaw || "—"}</TableCell>
                        <TableCell className="min-w-56 whitespace-normal">
                          {isValid ? (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="size-3" />
                              {t("rowValid")}
                            </Badge>
                          ) : (
                            <div className="space-y-1">
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="size-3" />
                                {t("rowInvalid")}
                              </Badge>
                              <ul className="text-xs text-destructive">
                                {row.errors.map((err, i) => (
                                  <li key={i}>• {err}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableShell>

            <div className="flex items-center justify-end gap-2">
              <Button
                loading={isPending}
                onClick={handleSubmit}
                disabled={validRows.length === 0}
              >
                {t("submitButton", { count: validRows.length })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("resultTitle")}</CardTitle>
            <CardDescription>
              {result.forbidden
                ? t("resultForbidden")
                : t("resultSummary", {
                    created: result.created,
                    failed: result.failed,
                  })}
            </CardDescription>
          </CardHeader>
          {result.results.length > 0 && (
            <CardContent>
              <DataTableShell>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>{t("colName")}</TableHead>
                      <TableHead>{t("colStatus")}</TableHead>
                      <TableHead>{t("colMessage")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.results.map((res) => (
                      <TableRow key={res.rowNumber}>
                        <TableCell className="text-muted-foreground">
                          {res.rowNumber}
                        </TableCell>
                        <TableCell className="font-medium">{res.name || "—"}</TableCell>
                        <TableCell>
                          {res.ok ? (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="size-3" />
                              {t("rowCreated")}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="size-3" />
                              {t("rowFailed")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-normal text-muted-foreground">
                          {res.message ??
                            (res.clubId ? (
                              <Link
                                href={`/dashboard/clubs/${res.clubId}`}
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                {t("openClub", { id: res.clubId })}
                              </Link>
                            ) : (
                              "—"
                            ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
