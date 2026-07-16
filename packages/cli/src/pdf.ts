/**
 * SVG → single-page PDF assembly.
 *
 * The browser renderer produces an SVG; here in Node we place it into a PDF page
 * sized to the diagram using `pdfkit` + `svg-to-pdfkit`. Keeping PDF generation
 * in Node avoids a second headless render path.
 */
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';

/**
 * Embed an SVG string into a one-page PDF whose page matches the diagram size.
 *
 * @param svg    SVG markup from the renderer.
 * @param width  Diagram width in points.
 * @param height Diagram height in points.
 * @returns the PDF file bytes.
 */
export function svgToPdf(svg: string, width: number, height: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    // Guard against a zero-sized page, which PDFKit rejects.
    const w = Math.max(1, Math.ceil(width));
    const h = Math.max(1, Math.ceil(height));
    const doc = new PDFDocument({ size: [w, h], margin: 0 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on('error', reject);

    try {
      SVGtoPDF(doc, svg, 0, 0, { width: w, height: h, assumePt: true });
      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
