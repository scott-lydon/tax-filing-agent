import { describe, it, expect } from 'vitest';
import { computeReturn } from './compute2025.js';
import type { Answers, FilingStatus, W2 } from './schemas.js';

function w2(box1: number, box2: number): W2 {
  return {
    employeeName: 'Test Filer',
    employeeSSN: '000-00-0000',
    employerName: 'Acme',
    employerEIN: '00-0000000',
    box1Wages: box1,
    box2FedWithholding: box2,
  };
}

function answers(over: Partial<Answers> & { filingStatus: FilingStatus }): Answers {
  return {
    filingStatus: over.filingStatus,
    qualifyingChildrenUnder17: over.qualifyingChildrenUnder17 ?? 0,
    otherDependents: over.otherDependents ?? 0,
    additionalIncome: over.additionalIncome ?? 0,
    additionalWithholding: over.additionalWithholding ?? 0,
    spouseName: over.spouseName,
    spouseSSN: over.spouseSSN,
    notes: over.notes,
  };
}

describe('2025 standard deduction by filing status', () => {
  const cases: Array<[FilingStatus, number]> = [
    ['single', 15750],
    ['mfj', 31500],
    ['mfs', 15750],
    ['hoh', 23625],
    ['qss', 31500],
  ];
  for (const [status, expected] of cases) {
    it(`${status} = ${expected}`, () => {
      const r = computeReturn(w2(40000, 0), answers({ filingStatus: status }));
      expect(r.line12_standardDeduction).toBe(expected);
    });
  }
});

describe('$40,000 single filer (the spec profile)', () => {
  // wages 40000, std deduction 15750, taxable 24250.
  // tax = 11925*0.10 + (24250-11925)*0.12 = 1192.5 + 1479 = 2671.5 -> 2672.
  const r = computeReturn(w2(40000, 4000), answers({ filingStatus: 'single' }));

  it('taxable income is wages minus standard deduction', () => {
    expect(r.line15_taxableIncome).toBe(24250);
  });
  it('tax is the bracket sum (2672)', () => {
    expect(r.line16_tax).toBe(2672);
  });
  it('with 4000 withheld, refund is 1328', () => {
    expect(r.line34_overpayment).toBe(1328);
    expect(r.line37_amountOwed).toBe(0);
    expect(r.refundOrOwe).toBe('refund');
  });
});

describe('balance due path', () => {
  it('low withholding produces an amount owed, not a refund', () => {
    const r = computeReturn(w2(40000, 1000), answers({ filingStatus: 'single' }));
    expect(r.line37_amountOwed).toBe(2672 - 1000);
    expect(r.line34_overpayment).toBe(0);
    expect(r.refundOrOwe).toBe('owe');
  });
});

describe('bracket transition boundaries (single)', () => {
  it('taxable income below the standard deduction yields zero tax', () => {
    const r = computeReturn(w2(10000, 0), answers({ filingStatus: 'single' }));
    expect(r.line15_taxableIncome).toBe(0);
    expect(r.line16_tax).toBe(0);
  });
  it('crossing the 10/12 percent boundary taxes only the excess at 12 percent', () => {
    // taxable income 11925 + 15750 std = 27675 wages -> taxable 11925 (exactly the 10% ceiling)
    const atCeiling = computeReturn(w2(27675, 0), answers({ filingStatus: 'single' }));
    expect(atCeiling.line15_taxableIncome).toBe(11925);
    expect(atCeiling.line16_tax).toBe(Math.round(11925 * 0.1)); // 1193

    // one dollar more of taxable income is taxed at 12%
    const overByOne = computeReturn(w2(27676, 0), answers({ filingStatus: 'single' }));
    expect(overByOne.line15_taxableIncome).toBe(11926);
    expect(overByOne.line16_tax).toBe(Math.round(11925 * 0.1 + 1 * 0.12)); // 1193
  });
});

describe('child tax credit (2025)', () => {
  it('one qualifying child offsets tax up to 2200', () => {
    const r = computeReturn(w2(40000, 4000), answers({ filingStatus: 'single', qualifyingChildrenUnder17: 1 }));
    expect(r.line19_childTaxCredit).toBe(2200);
    expect(r.line22_taxAfterCredits).toBe(2672 - 2200); // 472
    expect(r.line34_overpayment).toBe(4000 - 472); // 3528
  });
  it('credit is capped at the tax owed (cannot create negative tax on line 22)', () => {
    // low wages -> small tax; two children would exceed it
    const r = computeReturn(w2(20000, 500), answers({ filingStatus: 'single', qualifyingChildrenUnder17: 2 }));
    expect(r.line19_childTaxCredit).toBe(r.line16_tax);
    expect(r.line22_taxAfterCredits).toBe(0);
  });
});

describe('additional income and withholding flow through', () => {
  it('additional income raises total income and taxable income', () => {
    const base = computeReturn(w2(40000, 4000), answers({ filingStatus: 'single' }));
    const withExtra = computeReturn(w2(40000, 4000), answers({ filingStatus: 'single', additionalIncome: 5000 }));
    expect(withExtra.line9_totalIncome).toBe(base.line9_totalIncome + 5000);
    expect(withExtra.line15_taxableIncome).toBe(base.line15_taxableIncome + 5000);
  });
  it('estimated payments add to total withholding', () => {
    const r = computeReturn(w2(40000, 4000), answers({ filingStatus: 'single', additionalWithholding: 600 }));
    expect(r.line25d_totalWithholding).toBe(4600);
  });
});
