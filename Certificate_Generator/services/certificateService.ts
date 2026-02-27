import { loadImage, createCanvas, type SKRSContext2D, type Image as NapiImage } from '@napi-rs/canvas';
import fs from 'fs/promises';
import path from 'path';
import {
  GENERATED_DIR,
  ensureDir,
  sanitizeFilename,
  generateUniqueFilename,
} from '@/lib/constants';
import { registerFontForCanvas } from './fontService';
import type { FieldMapping } from '@/lib/types';

// ─── Per-process font registration cache ─────────────────────
const registeredFonts = new Set<string>();
// Maps user-selected family name → resolved family actually registered in @napi-rs/canvas
// e.g. "Arial" → "Open Sans" (because Arial isn't available on Linux servers)
const resolvedFontFamilies = new Map<string, string>();

/**
 * Pre-register all fonts used in the field list.
 * Called once before a batch so individual renders don't await I/O.
 * Stores resolved family name (may differ from requested, e.g. Arial → Open Sans).
 */
async function preRegisterFonts(fields: FieldMapping[]): Promise<void> {
  const uniqueFamilies = Array.from(new Set(fields.map((f) => f.fontFamily)));
  await Promise.all(
    uniqueFamilies
      .filter((fam) => !registeredFonts.has(fam))
      .map(async (fam) => {
        const resolvedFamily = await registerFontForCanvas(fam, 12);
        resolvedFontFamilies.set(fam, resolvedFamily);
        registeredFonts.add(fam);
      })
  );
}

/**
 * Draw one certificate onto a canvas and return the PNG buffer.
 * Does NOT do file I/O — keeps it composable and testable.
 */
function renderCertificate(
  templateImage: NapiImage,
  fields: FieldMapping[],
  rowData: Record<string, string>
): Buffer {
  const canvas = createCanvas(templateImage.width, templateImage.height);
  const ctx    = canvas.getContext('2d');
  ctx.drawImage(templateImage, 0, 0);

  for (const field of fields) {
    const text = (rowData[field.column] ?? '').toString().trim();
    if (!text) continue;
    renderTextField(ctx, text, field);
  }

  return canvas.toBuffer('image/png');
}

/**
 * Render a text field with auto-shrink and exact position.
 *
 * Coordinate contract (matches CanvasEditor with VPT + padding:0):
 *   field.x / field.y  →  top-left of the text in template pixels
 *   textBaseline = 'top'  →  y is the top of the em square
 *   textAlign depends on field.align (drawX adjusted accordingly)
 */
function renderTextField(
  ctx: SKRSContext2D,
  text: string,
  field: FieldMapping
): void {
  const { x, y, fontFamily, fontSize, color, align, maxWidth } = field;

  // Use the resolved family name — e.g. "Arial" may have been substituted with "Open Sans"
  // because @napi-rs/canvas on Linux doesn't have system fonts like Arial.
  const resolvedFamily = resolvedFontFamilies.get(fontFamily) || fontFamily;

  // ── Auto-shrink: reduce size until text fits maxWidth
  let curSize = fontSize;
  const minSize = Math.max(8, Math.round(fontSize * 0.4));
  ctx.font = `${curSize}px "${resolvedFamily}"`;

  if (maxWidth > 0) {
    while (curSize > minSize && ctx.measureText(text).width > maxWidth) {
      curSize -= 1;
      ctx.font = `${curSize}px "${resolvedFamily}"`;
    }
  }

  ctx.fillStyle   = color;
  ctx.textBaseline = 'top';   // top of em square → matches Fabric padding:0 top

  // ── Compute drawX so text anchors correctly within the maxWidth box
  let drawX = x;
  if (align === 'center') {
    ctx.textAlign = 'center';
    drawX = maxWidth > 0 ? x + maxWidth / 2 : x;
  } else if (align === 'right') {
    ctx.textAlign = 'right';
    drawX = maxWidth > 0 ? x + maxWidth : x;
  } else {
    ctx.textAlign = 'left';
    drawX = x;
  }

  ctx.fillText(text, drawX, y);
}

/**
 * Generate a single certificate and write it to disk.
 * Accept pre-loaded template image to avoid re-reading the file each time.
 */
export async function generateCertificate(
  templateImage: NapiImage,
  fields: FieldMapping[],
  rowData: Record<string, string>,
  outputPath: string
): Promise<string> {
  const buf = renderCertificate(templateImage, fields, rowData);
  await fs.writeFile(outputPath, buf);
  return outputPath;
}

/** Overload that accepts a file path (for single calls / preview). */
export async function generateCertificateFromPath(
  templatePath: string,
  fields: FieldMapping[],
  rowData: Record<string, string>,
  outputPath: string
): Promise<string> {
  const imgBuf = await fs.readFile(templatePath);
  const image  = await loadImage(imgBuf);
  return generateCertificate(image, fields, rowData, outputPath);
}

/**
 * Generate all certificates in parallel batches.
 * Template image is loaded ONCE and reused across all rows.
 * Batch size of 25 keeps memory bounded while maximising throughput.
 */
export async function generateAllCertificates(
  templatePath: string,
  fields: FieldMapping[],
  rows: Record<string, string>[],
  fileNameColumn: string
): Promise<string[]> {
  const sessionDir = path.join(GENERATED_DIR, `batch_${Date.now()}`);
  await ensureDir(sessionDir);

  // Load template & pre-register fonts before the batch loop
  const [imgBuf] = await Promise.all([
    fs.readFile(templatePath),
    preRegisterFonts(fields),
  ]);
  const templateImage = await loadImage(imgBuf);

  const existingNames = new Set<string>();
  const BATCH_SIZE = 25;   // 25 concurrent canvas renders is safe on most machines
  const allPaths: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchPaths = await Promise.all(
      batch.map(async (row, idx) => {
        const rawName = row[fileNameColumn] || `certificate_${i + idx + 1}`;
        const baseName = sanitizeFilename(rawName);
        const fileName = generateUniqueFilename(baseName, '.png', existingNames);
        const outPath  = path.join(sessionDir, fileName);
        await generateCertificate(templateImage, fields, row, outPath);
        return outPath;
      })
    );
    allPaths.push(...batchPaths);
  }

  return allPaths;
}

/**
 * Generate a preview PNG buffer for the first row.
 */
export async function generatePreview(
  templatePath: string,
  fields: FieldMapping[],
  firstRow: Record<string, string>
): Promise<Buffer> {
  const [imgBuf] = await Promise.all([
    fs.readFile(templatePath),
    preRegisterFonts(fields),
  ]);
  const image = await loadImage(imgBuf);
  return renderCertificate(image, fields, firstRow);
}
