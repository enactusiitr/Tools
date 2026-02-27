import path from 'path';
import fs from 'fs/promises';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
export const GENERATED_DIR = path.resolve(process.cwd(), 'generated');
export const FONTS_DIR = path.resolve(process.cwd(), 'fonts');
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
export const ALLOWED_DATA_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
];
export const ALLOWED_DATA_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

export async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 200);
}

export function generateUniqueFilename(
  baseName: string,
  ext: string,
  existingNames: Set<string>
): string {
  let name = `${baseName}${ext}`;
  let counter = 1;
  while (existingNames.has(name)) {
    name = `${baseName}_${counter}${ext}`;
    counter++;
  }
  existingNames.add(name);
  return name;
}
