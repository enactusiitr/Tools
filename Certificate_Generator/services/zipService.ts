import JSZip from 'jszip';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { GENERATED_DIR, ensureDir } from '@/lib/constants';

/**
 * Create a ZIP archive from an array of file paths using streaming output.
 *
 * Why streaming?
 * - For 1000 PNGs at ~300 KB each that's ~300 MB if buffered.
 * - generateNodeStream() pipes directly to a writable file stream
 *   so memory usage stays near the size of a single entry, not the whole set.
 */
export async function createZipFromFiles(filePaths: string[]): Promise<string> {
  const zip = new JSZip();

  // Add files as Node.js readable streams — JSZip will pull them lazily
  // during the streaming generation phase.
  for (const filePath of filePaths) {
    const name = path.basename(filePath);
    zip.file(name, createReadStream(filePath));
  }

  await ensureDir(GENERATED_DIR);
  const zipFileName = `certificates_${Date.now()}.zip`;
  const zipPath     = path.join(GENERATED_DIR, zipFileName);

  // Stream-write the ZIP to disk — never holds all PNGs in RAM at once.
  await new Promise<void>((resolve, reject) => {
    const writeStream = createWriteStream(zipPath);
    zip
      .generateNodeStream({
        type:               'nodebuffer',
        streamFiles:        true,
        compression:        'DEFLATE',
        compressionOptions: { level: 4 },  // level 4: good speed/size tradeoff
      })
      .pipe(writeStream)
      .on('finish', resolve)
      .on('error',  reject);
  });

  return zipPath;
}

/**
 * Clean up generated files after download.
 */
export async function cleanupGeneratedFiles(
  filePaths: string[],
  zipPath: string
): Promise<void> {
  const allPaths = [...filePaths, zipPath];
  const deletePromises = allPaths.map(async (fp) => {
    try {
      await fs.unlink(fp);
    } catch {
      // File may already be deleted, ignore
    }
  });
  await Promise.all(deletePromises);

  // Try to remove the batch directory
  if (filePaths.length > 0) {
    const batchDir = path.dirname(filePaths[0]);
    try {
      await fs.rmdir(batchDir);
    } catch {
      // Directory may not be empty or already removed
    }
  }
}
