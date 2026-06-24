import { readFileSync } from 'node:fs';
import { PDFDocument, PDFName, PDFString, PDFHexString } from 'pdf-lib';

const bytes = readFileSync(new URL('../assets/f1040-2025.pdf', import.meta.url));
const doc = await PDFDocument.load(bytes);
const form = doc.getForm();
const fields = form.getFields();

function tooltip(field) {
  const tu = field.acroField.dict.get(PDFName.of('TU'));
  if (tu instanceof PDFString || tu instanceof PDFHexString) return tu.decodeText();
  return '';
}

const filter = process.argv[2]?.toLowerCase();
console.log(`total fields: ${fields.length}`);
for (const f of fields) {
  const name = f.getName();
  const tip = tooltip(f).replace(/\s+/g, ' ').trim();
  if (filter && !(`${name} ${tip}`.toLowerCase().includes(filter))) continue;
  console.log(`${f.constructor.name}\t${name}\t${tip}`);
}
