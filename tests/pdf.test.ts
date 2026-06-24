import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { fillReturn } from '../server/pdf.js';
import { computeReturn } from '../tax/compute2025.js';
import { W2Schema, AnswersSchema, type Answers } from '../tax/schemas.js';

const sampleW2 = W2Schema.parse(
  JSON.parse(readFileSync(new URL('../assets/sample-w2.json', import.meta.url), 'utf8')),
);

function singleAnswers(): Answers {
  return AnswersSchema.parse({ filingStatus: 'single' });
}

describe('1040 PDF fill (AcroForm field drift guard)', () => {
  it('fills the real AcroForm fields with the computed values', async () => {
    const ret = computeReturn(sampleW2, singleAnswers());
    const { bytes, fieldsFilled, missing } = await fillReturn(ret, sampleW2, singleAnswers(), {
      flatten: false,
    });

    // No field name in the map drifted away from the template.
    expect(missing).toEqual([]);

    // Reload and read the AcroForm values back: they must match the inputs.
    const doc = await PDFDocument.load(bytes);
    const form = doc.getForm();
    const read = (name: string) => form.getTextField(name).getText();

    expect(read('topmostSubform[0].Page1[0].f1_47[0]')).toBe('40000'); // line 1a wages
    expect(read('topmostSubform[0].Page1[0].f1_73[0]')).toBe('40000'); // line 9 total income
    expect(read('topmostSubform[0].Page2[0].f2_02[0]')).toBe('15750'); // line 12 std deduction
    expect(read('topmostSubform[0].Page2[0].f2_06[0]')).toBe('24250'); // line 15 taxable income
    expect(read('topmostSubform[0].Page2[0].f2_08[0]')).toBe('2672'); // line 16 tax
    expect(read('topmostSubform[0].Page2[0].f2_17[0]')).toBe('4000'); // line 25a withholding
    expect(read('topmostSubform[0].Page2[0].f2_29[0]')).toBe('1328'); // line 34 refund

    // Filing status checkbox is checked.
    expect(form.getCheckBox('topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].c1_8[0]').isChecked()).toBe(
      true,
    );
    expect(fieldsFilled.filingStatus).toBe('single');
  });

  it('produces a flattened two-page PDF for download', async () => {
    const ret = computeReturn(sampleW2, singleAnswers());
    const { bytes } = await fillReturn(ret, sampleW2, singleAnswers());
    expect(bytes.byteLength).toBeGreaterThan(1000);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    // Flattened: no interactive fields remain.
    expect(doc.getForm().getFields().length).toBe(0);
  });

  it('fills the married-filing-jointly box and spouse name', async () => {
    const answers = AnswersSchema.parse({
      filingStatus: 'mfj',
      spouseName: 'Sam Q. Rivera',
      spouseSSN: '987-65-4321',
    });
    const ret = computeReturn(sampleW2, answers);
    const { bytes, missing } = await fillReturn(ret, sampleW2, answers, { flatten: false });
    expect(missing).toEqual([]);
    const form = (await PDFDocument.load(bytes)).getForm();
    expect(
      form.getCheckBox('topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].c1_8[1]').isChecked(),
    ).toBe(true);
    expect(form.getTextField('topmostSubform[0].Page1[0].f1_18[0]').getText()).toBe('Rivera');
    // mfj standard deduction flows onto line 12
    expect(form.getTextField('topmostSubform[0].Page2[0].f2_02[0]').getText()).toBe('31500');
  });
});
