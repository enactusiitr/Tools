import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { GENERATED_DIR } from '@/lib/constants';

/**
 * Serve generated files (preview images, ZIP archives).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get('file');

  if (!fileName) {
    return NextResponse.json(
      { error: 'Missing file parameter' },
      { status: 400 }
    );
  }

  // Security: prevent directory traversal
  const safeName = path.basename(fileName);
  const filePath = path.join(GENERATED_DIR, safeName);

  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.zip') contentType = 'application/zip';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    };

    if (ext === '.zip') {
      headers['Content-Disposition'] =
        `attachment; filename="certificates.zip"`;
    }

    return new NextResponse(buffer, { headers });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
