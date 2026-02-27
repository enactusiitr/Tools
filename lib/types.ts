// ─── Field Mapping ───────────────────────────────────────────────
export interface FieldMapping {
  id: string;
  column: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  maxWidth: number;
}

export interface MappingConfig {
  fields: FieldMapping[];
  templatePath: string;
  fileNameColumn: string;
}

// ─── API Responses ───────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UploadTemplateResponse {
  templatePath: string;
  templateUrl: string;
  width: number;
  height: number;
}

export interface UploadExcelResponse {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  filePath: string;
}

export interface GenerateResponse {
  zipUrl: string;
  totalGenerated: number;
}

export interface PreviewResponse {
  previewUrl: string;
}

// ─── Font ────────────────────────────────────────────────────────
export interface FontInfo {
  family: string;
  source: 'google' | 'system' | 'custom';
  path?: string;
}

// ─── Session State (frontend) ────────────────────────────────────
export interface SessionState {
  step: number;
  templateUrl: string | null;
  templatePath: string | null;
  templateWidth: number;
  templateHeight: number;
  excelPath: string | null;
  headers: string[];
  rows: Record<string, string>[];
  fields: FieldMapping[];
  fileNameColumn: string;
  previewUrl: string | null;
}
