import bracketsData from './brackets-2025.json' with { type: 'json' };
import type { Answers, FilingStatus, Return1040, W2 } from './schemas.js';

type Bracket = { rate: number; upTo: number | null };

const STANDARD_DEDUCTION = bracketsData.standardDeduction as Record<FilingStatus, number>;
const BRACKETS = bracketsData.brackets as Record<FilingStatus, Bracket[]>;
const CTC = bracketsData.childTaxCredit;

/** Round to whole dollars, the convention on a paper 1040. */
function dollars(n: number): number {
  return Math.round(n);
}

/**
 * Progressive tax on taxable income for a filing status, with a per-bracket breakdown
 * so the observation trail can show the math (pillar 4). Pure and deterministic.
 */
function computeTax(taxableIncome: number, status: FilingStatus) {
  const brackets = BRACKETS[status];
  const breakdown: Return1040['bracketBreakdown'] = [];
  let tax = 0;
  let lower = 0;
  for (const b of brackets) {
    const upper = b.upTo ?? Infinity;
    if (taxableIncome <= lower) break;
    const amountInBracket = Math.min(taxableIncome, upper) - lower;
    const taxForBracket = amountInBracket * b.rate;
    tax += taxForBracket;
    breakdown.push({
      rate: b.rate,
      amountInBracket: dollars(amountInBracket),
      taxForBracket: dollars(taxForBracket),
    });
    lower = upper;
  }
  return { tax: dollars(tax), breakdown };
}

/**
 * Child Tax Credit (2025, OBBBA). Up to $2,200 per qualifying child plus $500 per other
 * dependent (credit for other dependents), phased out above the AGI threshold. Non-refundable
 * portion is capped at the tax on line 18; the refundable ACTC is not modeled on the core
 * 1040 line 19 (it would flow to line 28 via Schedule 8812). Limited to line-19 nonrefundable
 * credit here, which is what a standard W-2 single/joint filer needs.
 */
function computeChildTaxCredit(answers: Answers, agi: number, taxBeforeCredits: number): number {
  const children = answers.qualifyingChildrenUnder17;
  const others = answers.otherDependents;
  if (children === 0 && others === 0) return 0;

  let credit = children * CTC.perChild + others * 500;

  const threshold = CTC.phaseoutStart[answers.filingStatus];
  if (agi > threshold) {
    const over = Math.ceil((agi - threshold) / 1000) * 1000;
    const reduction = (over / 1000) * CTC.phaseoutRatePer1000;
    credit = Math.max(0, credit - reduction);
  }
  // Nonrefundable credit cannot exceed the tax it offsets (line 18).
  return dollars(Math.min(credit, taxBeforeCredits));
}

/** Compute a 2025 Form 1040 from a W-2 and the collected answers. Pure function. */
export function computeReturn(w2: W2, answers: Answers): Return1040 {
  const status = answers.filingStatus;

  const line1a = dollars(w2.box1Wages);
  const line1z = line1a; // only box-1 wages in scope; lines 1b-1h are zero
  const line9 = dollars(line1z + answers.additionalIncome);
  const line11 = line9; // no above-the-line adjustments in scope
  const line12 = STANDARD_DEDUCTION[status];
  const line15 = Math.max(0, line11 - line12);

  const { tax: line16, breakdown } = computeTax(line15, status);

  const line19 = computeChildTaxCredit(answers, line11, line16);
  const line22 = Math.max(0, line16 - line19);
  const line24 = line22; // no other taxes in scope

  const line25a = dollars(w2.box2FedWithholding);
  const line25d = dollars(line25a + answers.additionalWithholding);
  const line33 = line25d;

  const overpayment = line33 > line24 ? line33 - line24 : 0;
  const owed = line24 > line33 ? line24 - line33 : 0;

  return {
    filingStatus: status,
    line1a_wages: line1a,
    line1z_totalWages: line1z,
    line9_totalIncome: line9,
    line11_agi: line11,
    line12_standardDeduction: line12,
    line15_taxableIncome: line15,
    line16_tax: line16,
    line19_childTaxCredit: line19,
    line22_taxAfterCredits: line22,
    line24_totalTax: line24,
    line25a_w2Withholding: line25a,
    line25d_totalWithholding: line25d,
    line33_totalPayments: line33,
    line34_overpayment: overpayment,
    line37_amountOwed: owed,
    bracketBreakdown: breakdown,
    refundOrOwe: overpayment > 0 ? 'refund' : owed > 0 ? 'owe' : 'even',
  };
}
