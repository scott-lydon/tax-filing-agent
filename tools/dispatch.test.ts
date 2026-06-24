import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSession } from '../server/session.js';
import { dispatchTool } from './dispatch.js';

const sampleW2 = JSON.parse(
  readFileSync(new URL('../assets/sample-w2.json', import.meta.url), 'utf8'),
);

describe('Layer A: Zod input validation (AT-H3)', () => {
  it('rejects negative income before the tool runs', async () => {
    const state = createSession();
    const res = await dispatchTool(state, 'record_answer', { additionalIncome: -500 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/invalid arguments/i);
  });

  it('rejects an out-of-enum filing status', async () => {
    const state = createSession();
    const res = await dispatchTool(state, 'record_answer', { filingStatus: 'martian' });
    expect(res.ok).toBe(false);
  });

  it('rejects a W-2 with a negative wage', async () => {
    const state = createSession();
    const res = await dispatchTool(state, 'record_w2', {
      w2: { ...sampleW2, box1Wages: -1 },
    });
    expect(res.ok).toBe(false);
  });

  it('compute_return refuses before a W-2 or filing status exists', async () => {
    const state = createSession();
    const res = await dispatchTool(state, 'compute_return', {});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.remediation).toMatch(/record_w2|filing status/i);
  });
});

describe('full tool chain produces a downloadable filled PDF (AT-H2)', () => {
  it('record_w2 -> record_answer -> compute_return -> finalize_and_render', async () => {
    const state = createSession();

    expect((await dispatchTool(state, 'record_w2', { w2: sampleW2 })).ok).toBe(true);
    expect((await dispatchTool(state, 'record_answer', { filingStatus: 'single' })).ok).toBe(true);

    const computed = await dispatchTool(state, 'compute_return', {});
    expect(computed.ok).toBe(true);
    if (computed.ok) {
      const r = computed.result as { line16_tax: number; line34_overpayment: number };
      expect(r.line16_tax).toBe(2672);
      expect(r.line34_overpayment).toBe(1328);
    }

    const finalized = await dispatchTool(state, 'finalize_and_render', {});
    expect(finalized.ok).toBe(true);
    if (finalized.ok) {
      const r = finalized.result as { download_url: string; fields_filled: Record<string, string> };
      expect(r.download_url).toBe(`/api/return/${state.id}/download`);
      expect(r.fields_filled.line1a_wages).toBe('40000');
    }
    expect(state.downloadReady).toBe(true);

    const pdfPath = join(process.env.TFA_DATA_DIR ?? '', 'returns', `${state.id}.pdf`);
    expect(existsSync(pdfPath)).toBe(true);
  });
});
