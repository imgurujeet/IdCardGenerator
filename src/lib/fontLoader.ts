/**
 * Font Loader & Font Management Utility
 * Ensures Google Fonts, system fonts, and custom uploaded fonts are properly fetched,
 * cached, and available for both interactive canvas editing and high-resolution 300 DPI exports.
 */

export const POPULAR_GOOGLE_FONTS = [
  'Inter',
  'Poppins',
  'Roboto',
  'Montserrat',
  'Oswald',
  'Outfit',
  'Lato',
  'Open Sans',
  'Playfair Display',
  'Bebas Neue',
  'Raleway',
  'Merriweather',
  'Cinzel',
  'JetBrains Mono',
] as const;

export const STANDARD_SYSTEM_FONTS = [
  'Arial',
  'Calibri',
  'Segoe UI',
  'Tahoma',
  'Trebuchet MS',
  'Verdana',
  'Times New Roman',
  'Georgia',
  'Garamond',
  'Palatino',
  'Courier New',
  'Consolas',
  'Lucida Console',
  'Century Gothic',
  'Franklin Gothic Medium',
  'Impact',
  'Comic Sans MS',
  'Bahnschrift',
  'Cambria',
  'Candara',
  'Constantia',
  'Corbel',
  'Bookman Old Style',
  'Helvetica',
] as const;

export const SYSTEM_FONTS = STANDARD_SYSTEM_FONTS;

const loadedFonts = new Set<string>();

/**
 * Detects all fonts installed locally on the user's OS (Windows/Mac/Linux)
 * using the modern Local Font Access API (window.queryLocalFonts).
 */
export async function detectLocalSystemFonts(): Promise<{
  success: boolean;
  fonts: string[];
  message?: string;
}> {
  if (typeof window !== 'undefined' && 'queryLocalFonts' in window) {
    try {
      const localFonts = await (window as any).queryLocalFonts();
      const uniqueFamilies = new Set<string>();
      for (const font of localFonts) {
        if (font.family) {
          uniqueFamilies.add(font.family);
        }
      }
      const sorted = Array.from(uniqueFamilies).sort((a, b) => a.localeCompare(b));
      return { success: true, fonts: sorted };
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        return {
          success: false,
          fonts: [...STANDARD_SYSTEM_FONTS],
          message: 'Permission to access PC fonts was denied. Standard system fonts are available.',
        };
      }
      return {
        success: false,
        fonts: [...STANDARD_SYSTEM_FONTS],
        message: err.message || 'Could not query local fonts.',
      };
    }
  }

  return {
    success: false,
    fonts: [...STANDARD_SYSTEM_FONTS],
    message:
      'Local Font Access query is available in Chrome/Edge/Brave over secure contexts. All standard Windows system fonts are pre-loaded in the dropdown.',
  };
}

/**
 * Loads a custom font file (.ttf, .otf, .woff, .woff2) into the document
 */
export async function loadFontFile(file: File): Promise<{ fontName: string; fontUrl: string }> {
  const fontName = file.name.replace(/\.[^/.]+$/, '').trim();
  const fontUrl = URL.createObjectURL(file);

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      const fontFace = new FontFace(fontName, `url(${fontUrl})`);
      const loadedFace = await fontFace.load();
      document.fonts.add(loadedFace);
      loadedFonts.add(fontName);
    } catch (err) {
      console.warn(`FontFace loading warning for ${fontName}:`, err);
    }
  }

  return { fontName, fontUrl };
}

/**
 * Dynamically injects and preloads Google Fonts or verifies font readiness.
 */
export async function ensureFontAvailable(fontFamily: string): Promise<boolean> {
  if (!fontFamily) return true;
  if ((STANDARD_SYSTEM_FONTS as readonly string[]).includes(fontFamily)) return true;
  if (loadedFonts.has(fontFamily)) return true;

  if (typeof document === 'undefined') return true;

  // Check if font already exists in document / system
  if (document.fonts && document.fonts.check) {
    try {
      if (document.fonts.check(`16px "${fontFamily}"`)) {
        loadedFonts.add(fontFamily);
        return true;
      }
    } catch {
      // ignore
    }
  }

  try {
    const fontId = `gfont-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      const encoded = encodeURIComponent(fontFamily);
      link.href = `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap`;
      document.head.appendChild(link);
    }

    if (document.fonts && document.fonts.load) {
      await Promise.race([
        Promise.all([
          document.fonts.load(`400 16px "${fontFamily}"`),
          document.fonts.load(`700 16px "${fontFamily}"`),
        ]),
        new Promise((resolve) => setTimeout(resolve, 1500)), // 1.5s timeout guard
      ]);
      await document.fonts.ready;
    }

    loadedFonts.add(fontFamily);
    return true;
  } catch (err) {
    console.warn(`Font "${fontFamily}" loading fallback:`, err);
    return false;
  }
}
