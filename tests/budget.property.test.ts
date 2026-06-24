import { describe, it, expect } from 'vitest';
import { createSession } from '../server/session.js';
import { dispatchTool } from '../tools/dispatch.js';
import { MAX_QUESTIONS } from '../guardrails/budget.js';

const QUESTION_IDS = ['filing_status', 'dependents', 'other_income', 'extra_withholding', 'anything_else'];

// Deterministic PRNG so the property test is reproducible.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe('Layer C: question budget property (AT-H5)', () => {
  it('no conversation ever issues more than 5 distinct questions across 20 randomized runs', async () => {
    for (let run = 0; run < 20; run++) {
      const rng = makeRng(run + 1);
      const state = createSession();
      const attempts = 8 + Math.floor(rng() * 12); // 8..19 attempts
      let allowedNew = 0;

      for (let i = 0; i < attempts; i++) {
        const qid = QUESTION_IDS[Math.floor(rng() * QUESTION_IDS.length)];
        const before = state.questionIds.length;
        const res = await dispatchTool(state, 'ask_question', { questionId: qid, text: `Q about ${qid}?` });
        const after = state.questionIds.length;
        if (after > before) allowedNew++;

        // Invariant: distinct questions asked never exceeds the cap.
        expect(state.questionIds.length).toBeLessThanOrEqual(MAX_QUESTIONS);
        expect(state.questionsAsked).toBeLessThanOrEqual(MAX_QUESTIONS);

        // A new distinct question beyond the cap must be refused.
        if (!res.ok) {
          expect(state.questionIds.length).toBe(MAX_QUESTIONS);
          expect(res.remediation).toMatch(/budget|wrap|ready/i);
        }
      }
      expect(allowedNew).toBeLessThanOrEqual(MAX_QUESTIONS);
    }
  });
});
