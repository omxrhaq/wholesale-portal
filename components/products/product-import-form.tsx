"use client";

import { useMemo, useState, useTransition } from "react";
import readXlsxFile from "read-excel-file/browser";

import { importProductsAction } from "@/app/dashboard/products/import/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ImportedProductRowInput } from "@/lib/validation/product-import";
import type { getProductImportCopy, getProductCopy } from "@/lib/i18n-copy";

type HeaderMapping = {
  name: string;
  sku: string;
  description: string;
  unit: string;
  price: string;
  isActive: string;
};

type ParsedSpreadsheet = {
  headers: string[];
  rows: string[][];
  fileName: string;
};

type SpreadsheetCell = string | number | boolean | Date | null;
type SpreadsheetRow = SpreadsheetCell[];
type SpreadsheetSheetResult = {
  sheet: string;
  data: SpreadsheetRow[];
};

type PreviewSort =
  | "row_asc"
  | "row_desc"
  | "name_asc"
  | "name_desc"
  | "sku_asc"
  | "sku_desc"
  | "unit_asc"
  | "unit_desc"
  | "price_asc"
  | "price_desc"
  | "active_asc"
  | "active_desc";

const fieldOptions = [
  { key: "name", required: true },
  { key: "sku", required: true },
  { key: "description", required: false },
  { key: "unit", required: true },
  { key: "price", required: true },
  { key: "isActive", required: false },
] as const;

const headerAliases: Record<keyof HeaderMapping, string[]> = {
  name: ["name", "naam", "product", "productnaam", "product name"],
  sku: ["sku", "artikelcode", "code", "productcode", "item code"],
  description: ["description", "beschrijving", "omschrijving"],
  unit: ["unit", "eenheid", "uom"],
  price: ["price", "prijs", "unit price", "verkoopprijs"],
  isActive: ["active", "actief", "status", "is active"],
};

type ProductImportFormProps = {
  copy: ReturnType<typeof getProductImportCopy> &
    Pick<
      ReturnType<typeof getProductCopy>,
      "name" | "sku" | "description" | "unit" | "price"
    >;
};

export function ProductImportForm({ copy }: ProductImportFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState<ParsedSpreadsheet | null>(null);
  const [mapping, setMapping] = useState<HeaderMapping | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    importedRows: number;
    updatedRows: number;
    failedRows: number;
    warnings: string[];
  } | null>(null);
  const [previewSort, setPreviewSort] = useState<PreviewSort>("row_asc");
  const [isPending, startTransition] = useTransition();

  const mappedPreview = useMemo(() => {
    if (!sheet || !mapping) {
      return [];
    }

    return buildImportRows(sheet.rows, sheet.headers, mapping).slice(0, 6);
  }, [mapping, sheet]);

  const sortedPreview = useMemo(
    () => sortPreviewRows(mappedPreview, previewSort),
    [mappedPreview, previewSort],
  );

  function handleFileChange(file: File | null) {
    setParseError(null);
    setResult(null);
    setSheet(null);
    setMapping(null);
    setSelectedFile(file);
  }

  async function handlePrepareFile() {
    if (!selectedFile) {
      setParseError(copy.selectFileFirst);
      return;
    }

    try {
      const rawWorkbook = (await readXlsxFile(selectedFile)) as
        | unknown
        | SpreadsheetRow[]
        | SpreadsheetSheetResult[];
      const workbookRows = normalizeWorkbookRows(rawWorkbook);

      if (workbookRows.length === 0) {
        setParseError(copy.emptyFile);
        return;
      }

      const headers = workbookRows[0].map((cell, index) =>
        String(cell ?? `Kolom ${index + 1}`).trim() || `Kolom ${index + 1}`,
      );
      const rows = workbookRows
        .slice(1)
        .map((row) => row.map((cell) => String(cell ?? "").trim()))
        .filter((row) => row.some((cell) => cell.length > 0));

      if (rows.length === 0) {
        setParseError(
          copy.noUsableRows,
        );
        return;
      }

      const nextSheet = {
        headers,
        rows,
        fileName: selectedFile.name,
      } satisfies ParsedSpreadsheet;

      setSheet(nextSheet);
      setMapping(getDefaultMapping(headers));
    } catch {
      setParseError(copy.readFailed);
    }
  }

  function handleMappingChange(field: keyof HeaderMapping, value: string) {
    setMapping((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  }

  function handleImport() {
    if (!sheet || !mapping) {
      setParseError(copy.loadFileFirst);
      return;
    }

    const missingRequiredFields = fieldOptions
      .filter((field) => field.required)
      .filter((field) => !mapping[field.key]);

    if (missingRequiredFields.length > 0) {
      setParseError(copy.mapRequired);
      return;
    }

    setParseError(null);
    setResult(null);

    const rows = buildImportRows(sheet.rows, sheet.headers, mapping);

    startTransition(async () => {
      const response = await importProductsAction({
        fileName: sheet.fileName,
        rows,
      });

      if (!response.success) {
        setParseError(response.error ?? copy.importFailed);
        return;
      }

      setResult(response.summary);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{copy.excelImport}</CardTitle>
          <CardDescription>
            {copy.importDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="excel-file">{copy.excelFile}</Label>
            <input
              id="excel-file"
              type="file"
              accept=".xlsx"
              className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />
            <p className="text-sm text-muted-foreground">
              {copy.fileHelp}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrepareFile}
              disabled={!selectedFile || isPending}
            >
              {copy.loadFile}
            </Button>
            <p className="text-sm text-muted-foreground">
              {selectedFile
                ? `${copy.selected}: ${selectedFile.name}`
                : copy.noFileSelected}
            </p>
          </div>

          {parseError ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {parseError}
            </p>
          ) : null}

          {sheet && mapping ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {fieldOptions.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={`mapping-${field.key}`}>
                      {getFieldLabel(field.key, copy)}
                      {field.required ? " *" : ""}
                    </Label>
                    <select
                      id={`mapping-${field.key}`}
                      value={mapping[field.key]}
                      onChange={(event) =>
                        handleMappingChange(field.key, event.target.value)
                      }
                      className="flex h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">{copy.doNotMap}</option>
                      {sheet.headers.map((header) => (
                        <option key={`${field.key}-${header}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-slate-950">{copy.preview}</h3>
                  <p className="text-sm text-muted-foreground">
                    {copy.previewDescription}
                  </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/70">
                  <table className="min-w-full divide-y divide-border bg-white text-sm">
                    <thead className="bg-slate-50/80 text-left text-slate-600">
                      <tr>
                        <PreviewHeader
                          label={copy.row}
                          sortKey="row"
                          activeSort={previewSort}
                          onSortChange={setPreviewSort}
                        />
                        <PreviewHeader
                          label={copy.name}
                          sortKey="name"
                          activeSort={previewSort}
                          onSortChange={setPreviewSort}
                        />
                        <PreviewHeader
                          label="SKU"
                          sortKey="sku"
                          activeSort={previewSort}
                          onSortChange={setPreviewSort}
                        />
                        <PreviewHeader
                          label={copy.unit}
                          sortKey="unit"
                          activeSort={previewSort}
                          onSortChange={setPreviewSort}
                        />
                        <PreviewHeader
                          label={copy.price}
                          sortKey="price"
                          activeSort={previewSort}
                          onSortChange={setPreviewSort}
                        />
                        <PreviewHeader
                          label={copy.active}
                          sortKey="active"
                          activeSort={previewSort}
                          onSortChange={setPreviewSort}
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {sortedPreview.map((row) => (
                        <tr key={row.sourceRowNumber}>
                          <td className="px-4 py-3">{row.sourceRowNumber}</td>
                          <td className="px-4 py-3">{row.name}</td>
                          <td className="px-4 py-3">{row.sku}</td>
                          <td className="px-4 py-3">{row.unit}</td>
                          <td className="px-4 py-3">{row.price}</td>
                          <td className="px-4 py-3">
                            {row.isActive ? copy.yes : copy.no}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={handleImport} disabled={isPending}>
                  {isPending ? copy.importing : copy.importProducts}
                </Button>
                <p className="self-center text-sm text-muted-foreground">
                  {formatTemplate(copy.fileWithRows, {
                    file: sheet.fileName,
                    rows: String(sheet.rows.length),
                  })}
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>{copy.importSummary}</CardTitle>
            <CardDescription>
              {copy.summaryDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryTile label={copy.importedOrProcessed} value={result.importedRows} />
              <SummaryTile label={copy.updated} value={result.updatedRows} />
              <SummaryTile label={copy.skipped} value={result.failedRows} />
            </div>

            {result.warnings.length > 0 ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-medium">{copy.warnings}</p>
                <ul className="mt-2 list-disc pl-5">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function PreviewHeader({
  label,
  sortKey,
  activeSort,
  onSortChange,
}: {
  label: string;
  sortKey: "row" | "name" | "sku" | "unit" | "price" | "active";
  activeSort: PreviewSort;
  onSortChange: (value: PreviewSort) => void;
}) {
  const isActive = activeSort.startsWith(`${sortKey}_`);
  const direction = isActive && activeSort.endsWith("_asc") ? "asc" : "desc";
  const indicator = isActive ? (direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-slate-900"
        onClick={() => onSortChange(getNextPreviewSort(sortKey, activeSort))}
      >
        {label}
        <span aria-hidden>{indicator}</span>
      </button>
    </th>
  );
}

function getFieldLabel(
  field: (typeof fieldOptions)[number]["key"],
  copy: ProductImportFormProps["copy"],
) {
  const labels: Record<(typeof fieldOptions)[number]["key"], string> = {
    name: copy.name,
    sku: copy.sku,
    description: copy.description,
    unit: copy.unit,
    price: copy.price,
    isActive: copy.active,
  };

  return labels[field];
}

function formatTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, value),
    template,
  );
}

function getNextPreviewSort(
  sortKey: "row" | "name" | "sku" | "unit" | "price" | "active",
  activeSort: PreviewSort,
) {
  const desc = `${sortKey}_desc` as PreviewSort;
  const asc = `${sortKey}_asc` as PreviewSort;

  if (activeSort === desc) {
    return asc;
  }

  return desc;
}

function sortPreviewRows(rows: ImportedProductRowInput[], sort: PreviewSort) {
  const sorted = [...rows];

  sorted.sort((a, b) => {
    switch (sort) {
      case "row_asc":
        return a.sourceRowNumber - b.sourceRowNumber;
      case "row_desc":
        return b.sourceRowNumber - a.sourceRowNumber;
      case "name_asc":
        return a.name.localeCompare(b.name, "en-US");
      case "name_desc":
        return b.name.localeCompare(a.name, "en-US");
      case "sku_asc":
        return a.sku.localeCompare(b.sku, "en-US");
      case "sku_desc":
        return b.sku.localeCompare(a.sku, "en-US");
      case "unit_asc":
        return a.unit.localeCompare(b.unit, "en-US");
      case "unit_desc":
        return b.unit.localeCompare(a.unit, "en-US");
      case "price_asc":
        return a.price - b.price;
      case "price_desc":
        return b.price - a.price;
      case "active_asc":
        return Number(a.isActive) - Number(b.isActive);
      case "active_desc":
        return Number(b.isActive) - Number(a.isActive);
      default:
        return 0;
    }
  });

  return sorted;
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function getDefaultMapping(headers: string[]): HeaderMapping {
  return {
    name: findMatchingHeader(headers, headerAliases.name),
    sku: findMatchingHeader(headers, headerAliases.sku),
    description: findMatchingHeader(headers, headerAliases.description),
    unit: findMatchingHeader(headers, headerAliases.unit),
    price: findMatchingHeader(headers, headerAliases.price),
    isActive: findMatchingHeader(headers, headerAliases.isActive),
  };
}

function findMatchingHeader(headers: string[], aliases: string[]) {
  return (
    headers.find((header) =>
      aliases.includes(header.trim().toLowerCase()),
    ) ?? ""
  );
}

function buildImportRows(
  rows: string[][],
  headers: string[],
  mapping: HeaderMapping,
): ImportedProductRowInput[] {
  const headerIndex = new Map(headers.map((header, index) => [header, index]));

  return rows.map((row, index) => {
    const getValue = (header: string) => {
      if (!header) {
        return "";
      }

      const cellIndex = headerIndex.get(header);
      return cellIndex === undefined ? "" : (row[cellIndex] ?? "").trim();
    };

    return {
      sourceRowNumber: index + 2,
      name: getValue(mapping.name),
      sku: getValue(mapping.sku),
      description: getValue(mapping.description),
      unit: getValue(mapping.unit),
      price: parseLocalizedNumber(getValue(mapping.price)),
      isActive: parseBooleanValue(getValue(mapping.isActive)),
    };
  });
}

function parseLocalizedNumber(value: string) {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBooleanValue(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return !["0", "nee", "no", "false", "inactive", "inactief"].includes(
    normalized,
  );
}

function normalizeWorkbookRows(
  rawWorkbook: unknown,
): SpreadsheetRow[] {
  if (!Array.isArray(rawWorkbook) || rawWorkbook.length === 0) {
    return [];
  }

  const firstEntry = rawWorkbook[0];

  if (
    typeof firstEntry === "object" &&
    firstEntry !== null &&
    "data" in firstEntry &&
    Array.isArray((firstEntry as SpreadsheetSheetResult).data)
  ) {
    return (firstEntry as SpreadsheetSheetResult).data;
  }

  return rawWorkbook as SpreadsheetRow[];
}
