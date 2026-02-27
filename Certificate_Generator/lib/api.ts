import type {
  ApiResponse,
  UploadTemplateResponse,
  UploadExcelResponse,
  GenerateResponse,
  PreviewResponse,
  FontInfo,
  FieldMapping,
} from '@/lib/types';

const BASE = '';

// ─── Template Upload ──────────────────────────────────────
export async function uploadTemplate(
  file: File
): Promise<ApiResponse<UploadTemplateResponse>> {
  const formData = new FormData();
  formData.append('template', file);
  const res = await fetch(`${BASE}/api/upload-template`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// ─── Excel/CSV Upload ────────────────────────────────────
export async function uploadExcel(
  file: File
): Promise<ApiResponse<UploadExcelResponse>> {
  const formData = new FormData();
  formData.append('dataFile', file);
  const res = await fetch(`${BASE}/api/upload-excel`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// ─── Fonts ────────────────────────────────────────────────
export async function fetchFonts(): Promise<ApiResponse<FontInfo[]>> {
  const res = await fetch(`${BASE}/api/fonts`);
  return res.json();
}

export async function uploadFont(
  file: File
): Promise<ApiResponse<FontInfo>> {
  const formData = new FormData();
  formData.append('font', file);
  const res = await fetch(`${BASE}/api/fonts/upload`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// ─── Preview ──────────────────────────────────────────────
export async function generatePreview(
  templatePath: string,
  fields: FieldMapping[],
  rows: Record<string, string>[]
): Promise<ApiResponse<PreviewResponse>> {
  const res = await fetch(`${BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templatePath,
      fields,
      rows: [rows[0]],
      fileNameColumn: 'preview',
      preview: true,
    }),
  });
  return res.json();
}

// ─── Bulk Generate ────────────────────────────────────────
export async function generateCertificates(
  templatePath: string,
  fields: FieldMapping[],
  rows: Record<string, string>[],
  fileNameColumn: string
): Promise<ApiResponse<GenerateResponse>> {
  const res = await fetch(`${BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templatePath,
      fields,
      rows,
      fileNameColumn,
    }),
  });
  return res.json();
}
