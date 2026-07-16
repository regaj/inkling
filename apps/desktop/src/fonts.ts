/**
 * Extend Excalidraw's hand-drawn "Excalifont" with handwritten Hebrew and Arabic
 * faces so RTL labels render in a matching style instead of a system fallback.
 *
 * Excalidraw's Excalifont `@font-face` (CSS-connected) declares no `unicode-range`,
 * so it nominally covers every codepoint but has no Hebrew/Arabic glyphs. We add
 * script-scoped faces under the SAME family name via the FontFace API; because
 * they are script-added (after the stylesheet parses) and carry a `unicode-range`,
 * the browser selects them for Hebrew/Arabic codepoints (last matching face wins).
 * Excalidraw redraws automatically once the faces finish loading.
 *
 * Amatic SC is a handwritten face covering Latin + Hebrew; Aref Ruqaa is a
 * calligraphic Arabic face. Latin keeps rendering in Excalifont.
 */
import amaticHebrew from '@fontsource/amatic-sc/files/amatic-sc-hebrew-700-normal.woff2';
import arefArabic from '@fontsource/aref-ruqaa/files/aref-ruqaa-arabic-400-normal.woff2';

const HEBREW_RANGE = 'U+0590-05FF, U+FB1D-FB4F';
const ARABIC_RANGE = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF';

let done = false;

/** Register the RTL Excalifont faces (idempotent). Safe to call before render. */
export async function registerScriptFonts(): Promise<void> {
  if (done || typeof FontFace === 'undefined') return;
  done = true;
  const defs: Array<[string, string]> = [
    [amaticHebrew, HEBREW_RANGE],
    [arefArabic, ARABIC_RANGE],
  ];
  await Promise.all(
    defs.map(async ([url, unicodeRange]) => {
      try {
        const face = new FontFace('Excalifont', `url(${url})`, { unicodeRange });
        await face.load();
        document.fonts.add(face);
      } catch {
        /* a missing/blocked font must not break the app */
      }
    }),
  );
}
