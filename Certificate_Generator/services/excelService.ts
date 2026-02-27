import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import fs from 'fs/promises';
import path from 'path';

/**
 * Parse Excel (.xlsx/.xls) or CSV files into a JSON array.
 */
export async function parseDataFile(
  filePath: string
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);

  if (ext === '.csv') {
    return parseCsv(buffer);
  }
  return parseExcel(buffer);
}

function parseExcel(buffer: Buffer): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel file has no sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
  });

  if (rawRows.length === 0) {
    throw new Error('Excel file is empty or has no data rows');
  }

  const headers = Object.keys(rawRows[0]);
  const rows = rawRows.map((row) => {
    const clean: Record<string, string> = {};
    for (const h of headers) {
      clean[h] = String(row[h] ?? '').trim();
    }
    return clean;
  });

  return { headers, rows };
}

function parseCsv(buffer: Buffer): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const records: string[][] = parse(buffer, {
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (records.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = records[0];
  const rows = records.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] ?? '').trim();
    });
    return obj;
  });

  return { headers, rows };
}
