import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_DATA_EXTENSIONS,
  ensureDir,
} from '@/lib/constants';
import { parseDataFile } from '@/services/excelService';
import type { ApiResponse, UploadExcelResponse } from '@/lib/types';

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<UploadExcelResponse>>> {
  try {
    const formData = await req.formData();
    const file = formData.get('dataFile') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate extension
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_DATA_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: ${ext}. Allowed: .xlsx, .xls, .csv`,
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
    await ensureDir(path.join(UPLOAD_DIR, 'data'));
    const fileName = `${uuidv4()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, 'data', fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Parse the file
    const { headers, rows } = await parseDataFile(filePath);

    if (headers.length === 0) {
      await fs.unlink(filePath);
      return NextResponse.json(
        { success: false, error: 'No columns found in the file' },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      await fs.unlink(filePath);
      return NextResponse.json(
        { success: false, error: 'No data rows found in the file' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        headers,
        rows,
        totalRows: rows.length,
        filePath,
      },
    });
  } catch (error) {
    console.error('Excel upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
