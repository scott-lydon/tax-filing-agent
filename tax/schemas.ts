import { z } from 'zod';

/** The five filing statuses the spec requires we support. */
export const FilingStatusSchema = z.enum(['single', 'mfj', 'mfs', 'hoh', 'qss']);
export type FilingStatus = z.infer<typeof FilingStatusSchema>;

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  mfj: 'Married filing jointly',
  mfs: 'Married filing separately',
  hoh: 'Head of household',
  qss: 'Qualifying surviving spouse',
};

/** A realistic Form W-2. Box 1 (wages) and box 2 (federal withholding) drive the return. */
export const W2Schema = z.object({
  employeeName: z.string().min(1),
  employeeSSN: z.string().min(1),
  employerName: z.string().min(1),
  employerEIN: z.string().min(1),
  box1Wages: z.number().nonnegative(),
  box2FedWithholding: z.number().nonnegative(),
  box3SsWages: z.number().nonnegative().optional(),
  box4SsTax: z.number().nonnegative().optional(),
  box5MedicareWages: z.number().nonnegative().optional(),
  box6MedicareTax: z.number().nonnegative().optional(),
  box16StateWages: z.number().nonnegative().optional(),
  box17StateTax: z.number().nonnegative().optional(),
});
export type W2 = z.infer<typeof W2Schema>;

/** The answers collected from the five questions, plus optional spouse identity for joint returns. */
export const AnswersSchema = z.object({
  filingStatus: FilingStatusSchema,
  qualifyingChildrenUnder17: z.number().int().nonnegative().default(0),
  otherDependents: z.number().int().nonnegative().default(0),
  additionalIncome: z.number().nonnegative().default(0),
  additionalWithholding: z.number().nonnegative().default(0),
  spouseName: z.string().optional(),
  spouseSSN: z.string().optional(),
  notes: z.string().optional(),
});
export type Answers = z.infer<typeof AnswersSchema>;

/** Computed 2025 Form 1040 result. Every field maps to a 1040 line; see tax/PDF_FIELDS.md. */
export interface Return1040 {
  filingStatus: FilingStatus;
  line1a_wages: number;
  line1z_totalWages: number;
  line9_totalIncome: number;
  line11_agi: number;
  line12_standardDeduction: number;
  line15_taxableIncome: number;
  line16_tax: number;
  line19_childTaxCredit: number;
  line22_taxAfterCredits: number;
  line24_totalTax: number;
  line25a_w2Withholding: number;
  line25d_totalWithholding: number;
  line33_totalPayments: number;
  line34_overpayment: number;
  line37_amountOwed: number;
  /** Step-by-step bracket math for the observation trail (pillar 4, AT-D3). */
  bracketBreakdown: Array<{ rate: number; amountInBracket: number; taxForBracket: number }>;
  refundOrOwe: 'refund' | 'owe' | 'even';
}
