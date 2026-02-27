import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import {
  generateAllCertificates,
  generatePreview,
} from '@/services/certificateService';
import { createZipFromFiles } from '@/services/zipService';
import { GENERATED_DIR, ensureDir } from '@/lib/constants';
import type {
  ApiResponse,
  GenerateResponse,
  PreviewResponse,
  FieldMapping,
} from '@/lib/types';

interface GenerateBody {
  templatePath: string;
  fields: FieldMapping[];
  rows: Record<string, string>[];
  fileNameColumn: string;
  preview?: boolean;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<GenerateResponse | PreviewResponse>>> {
  try {
    const body: GenerateBody = await req.json();
    const { templatePath, fields, rows, fileNameColumn, preview } = body;

    // Validate inputs
    if (!templatePath) {
      return NextResponse.json(
        { success: false, error: 'Template path is required' },
        { status: 400 }
      );
    }

    if (!fields || fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one field mapping is required' },
        { status: 400 }
      );
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data rows provided' },
        { status: 400 }
      );
    }

    // Verify template exists
    try {
      await fs.access(templatePath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Template file not found. Please re-upload.' },
        { status: 400 }
      );
    }

    // ── Preview Mode ──────────────────────────────
    if (preview) {
      const previewBuffer = await generatePreview(
        templatePath,
        fields,
        rows[0]
      );

      await ensureDir(GENERATED_DIR);
      const previewName = `preview_${Date.now()}.png`;
      const previewPath = path.join(GENERATED_DIR, previewName);
      await fs.writeFile(previewPath, previewBuffer);

      return NextResponse.json({
        success: true,
        data: {
          previewUrl: `/api/generate/serve?file=${encodeURIComponent(previewName)}`,
        } as PreviewResponse,
      });
    }

    // ── Bulk Generate Mode ────────────────────────
    const certPaths = await generateAllCertificates(
      templatePath,
      fields,
      rows,
      fileNameColumn || 'Name'
    );

    // Create ZIP
    const zipPath = await createZipFromFiles(certPaths);
    const zipName = path.basename(zipPath);

    // Clean up individual PNG files now that they're in the ZIP
    // Do this in the background so the response returns immediately
    setImmediate(async () => {
      try {
        await Promise.all(certPaths.map((p) => fs.unlink(p).catch(() => {})));
        const batchDir = path.dirname(certPaths[0]);
        await fs.rmdir(batchDir).catch(() => {});
      } catch { /* ignore cleanup errors */ }
    });

    return NextResponse.json({
      success: true,
      data: {
        zipUrl: `/api/generate/serve?file=${encodeURIComponent(zipName)}`,
        totalGenerated: certPaths.length,
      } as GenerateResponse,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      },
      { status: 500 }
    );
  }
}
