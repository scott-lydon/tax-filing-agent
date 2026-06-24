import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';

const bytes = readFileSync(new URL('../assets/f1040-2025.pdf', import.meta.url));
const doc = await PDFDocument.load(bytes);
const form = doc.getForm();
const pages = doc.getPages();
const pageRefs = pages.map((p) => p.ref);

const rows = [];
for (const f of form.getFields()) {
  const widgets = f.acroField.getWidgets();
  for (const w of widgets) {
    const rect = w.getRectangle();
    const pRef = w.P();
    let pageIdx = -1;
    for (let i = 0; i < pageRefs.length; i++) {
      if (pRef === pageRefs[i]) pageIdx = i;
    }
    rows.push({
      page: pageIdx,
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      type: f.constructor.name.replace('PDF', ''),
      name: f.getName(),
    });
  }
}

// Reading order: page, then top to bottom (y descending), then left to right.
rows.sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
const onlyPage = process.argv[2] !== undefined ? Number(process.argv[2]) : null;
for (const r of rows) {
  if (onlyPage !== null && r.page !== onlyPage) continue;
  const short = r.name.replace('topmostSubform[0].', '');
  console.log(`p${r.page} y=${String(r.y).padStart(3)} x=${String(r.x).padStart(3)} ${r.type.padEnd(9)} ${short}`);
}
