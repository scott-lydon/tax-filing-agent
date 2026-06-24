/**
 * Layer B guardrail: scope and safety. A hard-coded list checked against every user message
 * BEFORE it reaches the model. A match returns a friendly redirect and is logged as a
 * `guardrail_block` event in the trace. This is enforcement in code, not a prompt request.
 */

export interface RefusalRule {
  id: string;
  test: (text: string) => boolean;
  redirect: string;
}

function has(text: string, ...needles: string[]): boolean {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n));
}

export const REFUSAL_RULES: RefusalRule[] = [
  {
    id: 'tax_evasion',
    test: (t) =>
      has(t, 'hide income', 'hide my income', 'underreport', 'under-report', 'not report', "don't report", 'evade tax', 'evade taxes', 'cheat on', 'lie on', 'should i lie', 'falsify', 'fake income', 'fake deduction'),
    redirect:
      "I can't help with leaving income off or changing the numbers, that crosses into tax fraud. I'll fill the 1040 honestly from your real W-2 and answers. Want to keep going with the accurate figures?",
  },
  {
    id: 'legal_or_advice',
    test: (t) => has(t, 'legal advice', 'should i sue', 'represent me', 'is this legal advice', 'financial advice', 'investment advice'),
    redirect:
      "I'm a tax-filing helper, not a lawyer or financial advisor, so I can't give legal or investment advice. For the 1040 itself though, I've got you. What were we on?",
  },
  {
    id: 'prompt_injection',
    test: (t) => has(t, 'ignore previous instructions', 'ignore all previous', 'system prompt', 'reveal your prompt', 'your instructions', 'developer message', 'api key'),
    redirect:
      "I'll stay on task and keep your 1040 moving. Let's pick back up, what's the next detail you'd like to share?",
  },
  {
    id: 'out_of_scope_filing',
    test: (t) => has(t, 'e-file', 'efile', 'file it for me with the irs', 'submit to the irs', 'transmit to the irs', 'state return', 'previous year', 'prior year', '2023 return', '2024 return'),
    redirect:
      "This is a prototype that prepares a downloadable 2025 federal 1040 only, it doesn't e-file or do state or prior-year returns. I can still finish your 2025 federal form so you can review it. Sound good?",
  },
];

export interface RefusalResult {
  blocked: boolean;
  ruleId?: string;
  redirect?: string;
}

/** Returns the first matching refusal, or { blocked: false }. */
export function checkRefusals(userText: string): RefusalResult {
  for (const rule of REFUSAL_RULES) {
    if (rule.test(userText)) {
      return { blocked: true, ruleId: rule.id, redirect: rule.redirect };
    }
  }
  return { blocked: false };
}
