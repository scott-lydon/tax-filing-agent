import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import type { Answers, FilingStatus, Return1040, W2 } from '../tax/schemas.js';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(here, '..', 'assets', 'f1040-2025.pdf');

const P1 = 'topmostSubform[0].Page1[0].';
const P2 = 'topmostSubform[0].Page2[0].';

/** Verified 2025 Form 1040 AcroForm field names; see tax/PDF_FIELDS.md. */
const FIELD = {
  firstName: `${P1}f1_14[0]`,
  lastName: `${P1}f1_15[0]`,
  ssn: `${P1}f1_16[0]`,
  spouseFirstName: `${P1}f1_17[0]`,
  spouseLastName: `${P1}f1_18[0]`,
  spouseSSN: `${P1}f1_19[0]`,
  line1a: `${P1}f1_47[0]`,
  line1z: `${P1}f1_57[0]`,
  line9: `${P1}f1_73[0]`,
  line11: `${P1}f1_75[0]`,
  line12: `${P2}f2_02[0]`,
  line14: `${P2}f2_05[0]`,
  line15: `${P2}f2_06[0]`,
  line16: `${P2}f2_08[0]`,
  line19: `${P2}f2_11[0]`,
  line22: `${P2}f2_14[0]`,
  line24: `${P2}f2_16[0]`,
  line25a: `${P2}f2_17[0]`,
  line25d: `${P2}f2_20[0]`,
  line33: `${P2}f2_28[0]`,
  line34: `${P2}f2_29[0]`,
  line35a: `${P2}f2_30[0]`,
  line37: `${P2}f2_35[0]`,
} as const;

const FILING_STATUS_FIELD: Record<FilingStatus, string> = {
  single: `${P1}Checkbox_ReadOrder[0].c1_8[0]`,
  mfj: `${P1}Checkbox_ReadOrder[0].c1_8[1]`,
  mfs: `${P1}Checkbox_ReadOrder[0].c1_8[2]`,
  hoh: `${P1}c1_8[0]`,
  qss: `${P1}c1_8[1]`,
};

/** Whole-dollar string for a money line; empty string for zero so the form reads like a real return. */
function money(n: number): string {
  return n === 0 ? '' : String(Math.round(n));
}

/** SSN comb field holds 9 digits with no separators; strip dashes/spaces. */
function ssnDigits(ssn: string): string {
  return ssn.replace(/\D/g, '').slice(0, 9);
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

/**
 * Fill the official IRS 2025 Form 1040 from a computed return, then flatten it.
 * Returns the flattened PDF bytes plus the map of fields actually written (for the trace).
 * A field name that is missing from the template is recorded in `missing`, never silently dropped.
 */
export async function fillReturn(
  ret: Return1040,
  w2: W2,
  answers: Answers,
  options: { flatten?: boolean } = {},
): Promise<{ bytes: Uint8Array; fieldsFilled: Record<string, string>; missing: string[] }> {
  const doc = await PDFDocument.load(readFileSync(TEMPLATE_PATH));
  const form = doc.getForm();
  const fieldsFilled: Record<string, string> = {};
  const missing: string[] = [];

  const setText = (fieldName: string, value: string, label: string) => {
    if (value === '') return;
    try {
      form.getTextField(fieldName).setText(value);
      fieldsFilled[label] = value;
    } catch {
      missing.push(fieldName);
    }
  };

  const name = splitName(w2.employeeName);
  setText(FIELD.firstName, name.first, 'firstName');
  setText(FIELD.lastName, name.last, 'lastName');
  setText(FIELD.ssn, ssnDigits(w2.employeeSSN), 'ssn');

  if ((answers.filingStatus === 'mfj' || answers.filingStatus === 'mfs') && answers.spouseName) {
    const sp = splitName(answers.spouseName);
    setText(FIELD.spouseFirstName, sp.first, 'spouseFirstName');
    setText(FIELD.spouseLastName, sp.last, 'spouseLastName');
    if (answers.spouseSSN) setText(FIELD.spouseSSN, ssnDigits(answers.spouseSSN), 'spouseSSN');
  }

  try {
    form.getCheckBox(FILING_STATUS_FIELD[answers.filingStatus]).check();
    fieldsFilled.filingStatus = answers.filingStatus;
  } catch {
    missing.push(FILING_STATUS_FIELD[answers.filingStatus]);
  }

  setText(FIELD.line1a, money(ret.line1a_wages), 'line1a_wages');
  setText(FIELD.line1z, money(ret.line1z_totalWages), 'line1z_totalWages');
  setText(FIELD.line9, money(ret.line9_totalIncome), 'line9_totalIncome');
  setText(FIELD.line11, money(ret.line11_agi), 'line11_agi');
  setText(FIELD.line12, money(ret.line12_standardDeduction), 'line12_standardDeduction');
  setText(FIELD.line14, money(ret.line12_standardDeduction), 'line14_deductions');
  setText(FIELD.line15, money(ret.line15_taxableIncome), 'line15_taxableIncome');
  setText(FIELD.line16, money(ret.line16_tax), 'line16_tax');
  setText(FIELD.line19, money(ret.line19_childTaxCredit), 'line19_childTaxCredit');
  setText(FIELD.line22, money(ret.line22_taxAfterCredits), 'line22_taxAfterCredits');
  setText(FIELD.line24, money(ret.line24_totalTax), 'line24_totalTax');
  setText(FIELD.line25a, money(ret.line25a_w2Withholding), 'line25a_w2Withholding');
  setText(FIELD.line25d, money(ret.line25d_totalWithholding), 'line25d_totalWithholding');
  setText(FIELD.line33, money(ret.line33_totalPayments), 'line33_totalPayments');

  if (ret.line34_overpayment > 0) {
    setText(FIELD.line34, money(ret.line34_overpayment), 'line34_overpayment');
    setText(FIELD.line35a, money(ret.line34_overpayment), 'line35a_refund');
  } else if (ret.line37_amountOwed > 0) {
    setText(FIELD.line37, money(ret.line37_amountOwed), 'line37_amountOwed');
  }

  if (options.flatten !== false) form.flatten();
  const bytes = await doc.save();
  return { bytes, fieldsFilled, missing };
}
