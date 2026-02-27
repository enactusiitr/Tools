import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import { FONTS_DIR, ensureDir } from '@/lib/constants';
import type { FontInfo } from '@/lib/types';

// Google Fonts with download URLs (TTF links from fonts.google.com)
const GOOGLE_FONT_URLS: Record<string, string> = {
  'Roboto': 'https://fonts.gstatic.com/s/roboto/v47/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbGmT.ttf',
  'Open Sans': 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVc.ttf',
  'Lato': 'https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHvxk.ttf',
  'Montserrat': 'https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXo.ttf',
  'Poppins': 'https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrFJA.ttf',
  'Playfair Display': 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.ttf',
  'Dancing Script': 'https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSo3Sup6hNX6plRP.ttf',
  'Great Vibes': 'https://fonts.gstatic.com/s/greatvibes/v19/RWmMoKWR9v4ksMfaWd_JN-XCg6UKDXlq.ttf',
  'Pacifico': 'https://fonts.gstatic.com/s/pacifico/v22/FwZY7-Qmy14u9lezJ-6H6MmBp0u-.ttf',
  'Oswald': 'https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs1_FvsUZiYA.ttf',
  'Raleway': 'https://fonts.gstatic.com/s/raleway/v34/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvaorCIPrE.ttf',
  'Merriweather': 'https://fonts.gstatic.com/s/merriweather/v30/u-440qyriQus4w_Ih0T3LyhZwEiGA_6A.ttf',
  'Nunito': 'https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDLshdTQ3j77e.ttf',
  'Ubuntu': 'https://fonts.gstatic.com/s/ubuntu/v20/4iCs6KVjbNBYlgo6eA.ttf',
};

const GOOGLE_FONTS: FontInfo[] = Object.keys(GOOGLE_FONT_URLS).map((f) => ({
  family: f,
  source: 'google' as const,
}));

// System fonts that @napi-rs/canvas natively has on Linux
const NAPI_BUILTIN_FONTS = ['DejaVu Sans', 'DejaVu Serif', 'DejaVu Sans Mono', 'FreeSans', 'FreeSerif', 'FreeMono'];

// When user picks a common system font, substitute it with a downloadable Google Font
// so @napi-rs/canvas always has something to render with.
const SYSTEM_FONT_FALLBACKS: Record<string, string> = {
  'Arial':            'Open Sans',
  'Arial Black':      'Oswald',
  'Helvetica':        'Open Sans',
  'sans-serif':       'Open Sans',
  'Times New Roman':  'Merriweather',
  'Times':            'Merriweather',
  'Georgia':          'Merriweather',
  'serif':            'Merriweather',
  'Courier New':      'Ubuntu',
  'Courier':          'Ubuntu',
  'monospace':        'Ubuntu',
  'Verdana':          'Open Sans',
  'Tahoma':           'Open Sans',
  'Impact':           'Oswald',
  'Trebuchet MS':     'Raleway',
  'Palatino':         'Merriweather',
};

const SYSTEM_FONTS: FontInfo[] = [
  { family: 'Arial', source: 'system' },
  { family: 'Times New Roman', source: 'system' },
  { family: 'Courier New', source: 'system' },
  { family: 'Georgia', source: 'system' },
  { family: 'Verdana', source: 'system' },
  { family: 'Helvetica', source: 'system' },
  { family: 'sans-serif', source: 'system' },
  { family: 'serif', source: 'system' },
];

// Cache downloaded Google Font files
const downloadedGoogleFonts = new Set<string>();

/**
 * Return all available fonts (system + google + custom uploaded).
 */
export async function getAvailableFonts(): Promise<FontInfo[]> {
  const customFonts = await getCustomFonts();
  return [...SYSTEM_FONTS, ...GOOGLE_FONTS, ...customFonts];
}

/**
 * List custom fonts from the fonts/ directory.
 */
async function getCustomFonts(): Promise<FontInfo[]> {
  await ensureDir(FONTS_DIR);
  const files = await fs.readdir(FONTS_DIR);
  return files
    .filter((f) => /\.(ttf|otf|woff|woff2)$/i.test(f))
    .map((f) => ({
      family: path.basename(f, path.extname(f)),
      source: 'custom' as const,
      path: path.join(FONTS_DIR, f),
    }));
}

/**
 * Register a custom font file (save to fonts directory).
 */
export async function registerCustomFont(
  buffer: Buffer,
  originalName: string
): Promise<FontInfo> {
  await ensureDir(FONTS_DIR);
  const ext = path.extname(originalName).toLowerCase();
  const family = path.basename(originalName, ext);
  const filename = `${family}${ext}`;
  const destPath = path.join(FONTS_DIR, filename);
  await fs.writeFile(destPath, buffer);
  return { family, source: 'custom', path: destPath };
}

/**
 * Download a file from URL and return as Buffer.
 */
function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Download and register a Google Font if not already cached.
 */
async function ensureGoogleFont(fontFamily: string): Promise<boolean> {
  if (downloadedGoogleFonts.has(fontFamily)) return true;

  const url = GOOGLE_FONT_URLS[fontFamily];
  if (!url) return false;

  try {
    await ensureDir(FONTS_DIR);
    const safeName = fontFamily.replace(/[^a-zA-Z0-9]/g, '_');
    const fontPath = path.join(FONTS_DIR, `google_${safeName}.ttf`);

    // Check if already downloaded to disk
    try {
      await fs.access(fontPath);
    } catch {
      // Download the font
      console.log(`Downloading Google Font: ${fontFamily}`);
      const buffer = await downloadFile(url);
      await fs.writeFile(fontPath, buffer);
    }

    // Register with @napi-rs/canvas
    const { GlobalFonts } = await import('@napi-rs/canvas');
    GlobalFonts.registerFromPath(fontPath, fontFamily);
    downloadedGoogleFonts.add(fontFamily);
    return true;
  } catch (err) {
    console.error(`Failed to download Google Font ${fontFamily}:`, err);
    return false;
  }
}

/**
 * Register a font for @napi-rs/canvas rendering.
 * Returns the RESOLVED family name that was actually registered
 * (may differ from the input if a substitution was made, e.g. Arial → Open Sans).
 */
export async function registerFontForCanvas(
  fontFamily: string,
  fontSize: number
): Promise<string> {
  const { GlobalFonts } = await import('@napi-rs/canvas');

  // 1. Check if it's a custom font
  const customFonts = await getCustomFonts();
  const customFont = customFonts.find((f) => f.family === fontFamily);
  if (customFont && customFont.path) {
    GlobalFonts.registerFromPath(customFont.path, fontFamily);
    return fontFamily;
  }

  // 2. Check if it's a Google Font → download & register
  if (GOOGLE_FONT_URLS[fontFamily]) {
    const ok = await ensureGoogleFont(fontFamily);
    if (ok) return fontFamily;
  }

  // 3. Check if @napi-rs/canvas has this font natively (e.g. DejaVu Sans, FreeSans)
  const families = GlobalFonts.families;
  const available = Array.isArray(families)
    ? families.map((f: any) => (typeof f === 'string' ? f : f?.family))
    : [];
  if (available.some((f: string) => f?.toLowerCase() === fontFamily.toLowerCase())) {
    return fontFamily;
  }

  // 4. System font like "Arial" not available in @napi-rs/canvas on Linux.
  //    Substitute with a Google Font equivalent so text always renders.
  const googleSubstitute = SYSTEM_FONT_FALLBACKS[fontFamily];
  if (googleSubstitute && GOOGLE_FONT_URLS[googleSubstitute]) {
    console.log(`Font "${fontFamily}" not available in @napi-rs/canvas, substituting with "${googleSubstitute}"`);
    const ok = await ensureGoogleFont(googleSubstitute);
    if (ok) return googleSubstitute;
  }

  // 5. Try downloading Open Sans as a universal fallback
  console.log(`Trying Open Sans as universal fallback for "${fontFamily}"`);
  const fallbackOk = await ensureGoogleFont('Open Sans');
  if (fallbackOk) return 'Open Sans';

  // 6. Absolute last resort: DejaVu Sans is always bundled with @napi-rs/canvas on Linux
  console.warn(`All font fallbacks failed for "${fontFamily}", using DejaVu Sans`);
  return 'DejaVu Sans';
}
