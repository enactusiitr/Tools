import { NextResponse } from 'next/server';
import { getAvailableFonts } from '@/services/fontService';
import type { ApiResponse, FontInfo } from '@/lib/types';

export async function GET(): Promise<NextResponse<ApiResponse<FontInfo[]>>> {
  try {
    const fonts = await getAvailableFonts();
    return NextResponse.json({ success: true, data: fonts });
  } catch (error) {
    console.error('Font list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load fonts',
      },
      { status: 500 }
    );
  }
}
