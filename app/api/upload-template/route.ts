import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ensureDir,
} from '@/lib/constants';
import type { ApiResponse, UploadTemplateResponse } from '@/lib/types';

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<UploadTemplateResponse>>> {
  try {
    const formData = await req.formData();
    const file = formData.get('template') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: ${file.type}. Allowed: PNG, JPG`,
        },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Save file
    await ensureDir(path.join(UPLOAD_DIR, 'templates'));
    const ext = path.extname(file.name) || '.png';
    const fileName = `${uuidv4()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, 'templates', fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Get image dimensions using @napi-rs/canvas
    const { loadImage } = await import('@napi-rs/canvas');
    const image = await loadImage(buffer);

    return NextResponse.json({
      success: true,
      data: {
        templatePath: filePath,
        templateUrl: `/api/upload-template?path=${encodeURIComponent(fileName)}`,
        width: image.width,
        height: image.height,
      },
    });
  } catch (error) {
    console.error('Template upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get('path');

  if (!fileName) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  try {
    const filePath = path.join(UPLOAD_DIR, 'templates', fileName);
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' : 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
