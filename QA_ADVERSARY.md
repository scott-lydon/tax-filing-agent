# QA_ADVERSARY.md (tax-filing-agent)

How the `vouch` sub-agent attacks THIS project. This file is the authoritative override on vouch's generic prompt. Populated for the tax-filing-agent, not a template.

## Test runner

- Unit + integration: `npm test` (Vitest, config in `vitest.config.ts`).
- End-to-end: `npm run test:e2e` (Playwright, `playwright.config.ts`), one happy path; can target the live URL with `E2E_BASE_URL=https://<service>.onrender.com`.
- Lint: `npm run lint` (ESLint + `@typescript-eslint`).
- Type check: `npm run typecheck` (`tsc --noEmit`).

## Harness location

- Unit and integration tests live under `tests/` and beside the modules they cover (`tax/compute2025.test.ts`, `guardrails/*.test.ts`).
- The property test that asserts the 5-question budget is `tests/budget.property.test.ts` (20 randomized conversations).
- The end-to-end happy path is `tests/e2e/happy-path.spec.ts`.

## Base branch for diff

- Diff against `origin/main`. For a slice review, diff the slice's first commit parent against HEAD.

## Named bug categories to hunt

1. **Question-budget escape.** Any path where the agent issues a sixth distinct question. The counter must be enforced in code, not just the prompt. Try conversations that bundle two questions in one turn, or that loop the agent with confusing answers.
2. **Tax-math errors.** Wrong standard deduction for a filing status, off-by-one bracket boundary, sign error on refund vs balance due, withholding ignored, dependent credit misapplied. Cross-check `tax/compute2025.ts` against `tax/brackets-2025.json` and `tax/SOURCES.md`.
3. **PDF fill drift.** AcroForm field names that do not exist in `assets/f1040-2025.pdf`, silently dropped fields, an unflattened download, wrong line mapping (wages on the wrong line).
4. **Guardrail bypass.** A refusal-list phrase that slips through, an out-of-enum filing status or negative income that reaches a tool, real-PII intake not blocked.
5. **State loss.** A server restart that wipes an in-flight session; a fact from turn one the agent cannot quote after restart.
6. **Observation gaps.** A tool call or guardrail block that does not appear in `data/sessions/<id>.jsonl` or the trace endpoint; events out of order.
7. **Fake/stale data leak.** Any non-sample data that is mocked, hardcoded, or replayed and presented as real. The only permitted fake data is `assets/sample-w2.json`.
8. **Deploy drift.** The deployed `/api/health` sha not matching the latest main commit; a stale cached bundle (verify Vite hash in the live `index.html`).

## Hot files (recent + high-risk)

- `tax/compute2025.ts`, `tax/brackets-2025.json` (math correctness)
- `tools/schemas.ts`, `tools/dispatch.ts` (validation seam)
- `guardrails/refusals.ts`, `guardrails/budget.ts` (the three layers)
- `server/harness.ts` (chat loop + tool loop)
- `server/pdf.ts` (AcroForm fill + flatten)

(Refresh from `git diff --name-only HEAD~15..HEAD` before each review.)

## Non-negotiables from the spec

- Form 1040, tax year 2025; W-2 profile around $40,000.
- At most 5 questions, ever.
- Warm, human tone; never "as an AI"; no false reassurance; "not tax advice" carried lightly.
- Downloadable filled 1040.
- Web chat, deployed to a public URL on Render.
- Must work end to end, not a happy-path mock.
- Fake data only; no e-filing; not tax advice.

## Conventions

- A bug surfaces as a failing test or a written finding, never a silent patch (vouch has Read/Grep/Glob/Bash only).
- Report to `RUN_REPORT.md` at the repo root.
- Ignore `node_modules/`, `client/dist/`, `data/` (runtime artifacts).

## End-to-end pipeline command

```bash
npm ci && npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e
```
