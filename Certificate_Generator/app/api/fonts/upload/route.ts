import { NextRequest, NextResponse } from 'next/server';
import { registerCustomFont } from '@/services/fontService';
import type { ApiResponse, FontInfo } from '@/lib/types';

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<FontInfo>>> {
  try {
    const formData = await req.formData();
    const file = formData.get('font') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No font file uploaded' },
        { status: 400 }
      );
    }

    const validExts = ['.ttf', '.otf', '.woff', '.woff2'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExts.includes(ext)) {
      return NextResponse.json(
        { success: false, error: 'Invalid font format. Use TTF, OTF, WOFF, or WOFF2.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fontInfo = await registerCustomFont(buffer, file.name);

    return NextResponse.json({ success: true, data: fontInfo });
  } catch (error) {
    console.error('Font upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Font upload failed',
      },
      { status: 500 }
    );
  }
}
