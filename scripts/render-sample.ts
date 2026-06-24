import { readFileSync, writeFileSync } from 'node:fs';
import { fillReturn } from '../server/pdf.js';
import { computeReturn } from '../tax/compute2025.js';
import { W2Schema, AnswersSchema } from '../tax/schemas.js';

const w2 = W2Schema.parse(JSON.parse(readFileSync('assets/sample-w2.json', 'utf8')));
const answers = AnswersSchema.parse({ filingStatus: 'single' });
const ret = computeReturn(w2, answers);
const { bytes, missing } = await fillReturn(ret, w2, answers);
writeFileSync('assets/_filled-sample.pdf', bytes);
console.log('missing:', missing, 'refund:', ret.line34_overpayment);
