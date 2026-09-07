import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

const defaultWorkbookPath = path.join("data", "insa_tca.xlsx");
const source = "portfir_bdca";
const locale = "pt-PT";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const workbookPath = readArgValue("--file") ?? defaultWorkbookPath;

loadEnvFile(".env.local");

const workbook = XLSX.readFile(workbookPath, { cellDates: false });
const sheetName = workbook.SheetNames.find((name) => name.startsWith("INSA - BDCA")) ?? workbook.SheetNames[0];
const infoSheetName = workbook.SheetNames.find((name) => normalizeText(name).includes("informacao adicional"));
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
  defval: null,
  header: 1,
  raw: true
});
const headers = rows[1] ?? [];
const dataRows = rows.slice(2);
const sourceVersion = readSourceVersion(workbook, infoSheetName) ?? "v 7.1 - 2026";
const records = dataRows.map((row) => mapPortfirRow(row, headers, sourceVersion)).filter(Boolean);

console.log(`Workbook: ${workbookPath}`);
console.log(`Sheet: ${sheetName}`);
console.log(`Source version: ${sourceVersion}`);
console.log(`Parsed records: ${records.length}`);

if (records.length > 0) {
  console.log("First record:");
  console.log(JSON.stringify(records[0], null, 2));
}

if (dryRun) {
  console.log("Dry run complete. No rows were uploaded.");
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Add them to .env.local, then rerun without --dry-run.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false
  }
});

const chunkSize = 250;
let uploaded = 0;

for (let index = 0; index < records.length; index += chunkSize) {
  const chunk = records.slice(index, index + chunkSize);
  const { error } = await supabase.from("reference_foods").upsert(chunk, {
    onConflict: "source,source_version,source_food_id"
  });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  uploaded += chunk.length;
  console.log(`Uploaded ${uploaded}/${records.length}`);
}

console.log("PortFIR import complete.");

function mapPortfirRow(row, headers, sourceVersion) {
  const sourceFoodId = readString(row, headers, "Cod");
  const name = readString(row, headers, "Nome do alimento");

  if (!sourceFoodId || !name) {
    return null;
  }

  return {
    source,
    source_food_id: sourceFoodId,
    source_version: normalizeSourceVersion(sourceVersion),
    name,
    normalized_name: normalizeText(name),
    brand: null,
    category: readString(row, headers, "Nível 1") ?? null,
    locale,
    serving_quantity: 100,
    serving_unit: "g",
    calories: readRequiredNumber(row, headers, "Energia", "kcal"),
    protein_g: readRequiredNumber(row, headers, "Proteínas", "g"),
    carbohydrate_g: readRequiredNumber(row, headers, "Hidratos de carbono", "g"),
    fat_g: readRequiredNumber(row, headers, "Lípidos", "g"),
    saturated_fat_g: readNullableNumber(row, headers, "Ácidos gordos saturados", "g"),
    fibre_g: readNullableNumber(row, headers, "Fibra", "g"),
    total_sugars_g: readNullableNumber(row, headers, "Açúcares", "g"),
    added_sugar_g: null,
    salt_g: readNullableNumber(row, headers, "Sal", "g"),
    raw_data: {
      level_1: readString(row, headers, "Nível 1"),
      level_2: readString(row, headers, "Nível 2"),
      level_3: readString(row, headers, "Nível 3")
    }
  };
}

function readRequiredNumber(row, headers, label, unit) {
  const value = readNullableNumber(row, headers, label, unit);

  if (value === null) {
    throw new Error(`Missing required PortFIR value: ${label} [${unit}]`);
  }

  return value;
}

function readNullableNumber(row, headers, label, unit) {
  const index = findHeaderIndex(headers, label, unit);
  const value = row[index];

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function readString(row, headers, label) {
  const index = findHeaderIndex(headers, label);
  const value = row[index];

  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function findHeaderIndex(headers, label, unit) {
  const normalizedLabel = normalizeText(label);
  const normalizedUnit = unit ? normalizeText(unit) : null;
  const index = headers.findIndex((header) => {
    const normalizedHeader = normalizeText(String(header ?? ""));
    return (
      normalizedHeader.includes(normalizedLabel) &&
      (!normalizedUnit || normalizedHeader.includes(normalizedUnit))
    );
  });

  if (index === -1) {
    throw new Error(`Could not find PortFIR column: ${label}${unit ? ` [${unit}]` : ""}`);
  }

  return index;
}

function readSourceVersion(workbook, infoSheetName) {
  if (!infoSheetName) {
    return null;
  }

  const infoRows = XLSX.utils.sheet_to_json(workbook.Sheets[infoSheetName], {
    defval: null,
    header: 1,
    raw: false
  });
  const text = infoRows.flat().filter(Boolean).join("\n");
  const version = text.match(/v\s*[\d.]+\s*-\s*\d{4}/i)?.[0];
  return version ?? null;
}

function normalizeSourceVersion(value) {
  return value.toLowerCase().replace(/\s+/g, "_");
}

function normalizeText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readArgValue(name) {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
