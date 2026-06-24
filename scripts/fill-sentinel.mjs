import { readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';

const bytes = readFileSync(new URL('../assets/f1040-2025.pdf', import.meta.url));
const doc = await PDFDocument.load(bytes);
const form = doc.getForm();

for (const f of form.getFields()) {
  if (f.constructor.name !== 'PDFTextField') continue;
  // e.g. ...Page1[0].f1_47[0] -> "1.47"; ...Page2[0].f2_10[0] -> "2.10"
  const m = f.getName().match(/f(\d)_(\d+)\[/);
  const tag = m ? `${m[1]}.${m[2]}` : '?';
  try {
    f.setText(tag);
    f.setFontSize(6);
  } catch {
    // skip fields that reject text
  }
}

const out = await doc.save();
writeFileSync(new URL('../assets/_sentinel.pdf', import.meta.url), out);
console.log('wrote assets/_sentinel.pdf');
