# Adversary Run Report (tax-filing-agent)

Fresh-context QA adversary run on 2026-06-24. Read-only review plus deterministic execution. No source files were edited. No real Anthropic API calls were made.

## 1. Pipeline commands

| Command | Result |
|---|---|
| `npm run typecheck` | FAIL: 1 error (see below) |
| `npm run lint` | PASS (0 problems) |
| `npm test` | PASS: 6 files, 32 tests passed |
| `npm run build` | PASS (client `tsc -b && vite build`, dist regenerated) |

Typecheck failure, verbatim:

```
tests/e2e/happy-path.spec.ts(35,16): error TS2584: Cannot find name 'document'. Do you need to change your target library? Try changing the 'lib' compiler option to include 'dom'.
```

Root cause: `tsconfig.json` sets `"lib": ["ES2022"]` (no DOM) and `"include": [..., "tests"]`, which sweeps in `tests/e2e/happy-path.spec.ts`. That Playwright spec calls `document.querySelectorAll` (line 35). Vitest excludes `tests/e2e/**`, and the client has its own DOM-aware tsconfig, but the root `tsc --noEmit` does not exclude e2e, so `npm run typecheck` fails. The documented end-to-end pipeline (`npm ci && npm run typecheck && ...`) halts here.

## 2. Findings by bug category

### Tax math — VERIFIED CORRECT
Independently re-derived $40k single: standard deduction 15,750 → taxable 24,250. Tax = 11,925 x 0.10 (1,192.50) + 12,325 x 0.12 (1,479.00) = 2,671.50 → rounds to 2,672. Refund = 4,000 − 2,672 = 1,328. `compute2025.ts` returns exactly tax 2,672, refund 1,328. `brackets-2025.json` matches `tax/SOURCES.md` line for line (all 5 statuses, all 7 rates, mfs top thresholds = half of mfj). Standard deductions verified per status: single 15,750, mfj 31,500, mfs 15,750, hoh 23,625, qss 31,500. Refund/owe sign correct (owe case: tax 2,672 − 500 = 2,172 owed; zero-taxable → "even"). CTC nonrefundable cap verified (3 kids x 2,200 = 6,600 capped to tax 1,472, line22 → 0). CTC phaseout verified (single AGI 250k, 2 kids: 4,400 − (50 x 50) = 1,900). No tax-math defect found.

### PDF fill drift — VERIFIED CORRECT
Loaded `assets/f1040-2025.pdf` (199 AcroForm fields after XFA strip) and checked every field name in `server/pdf.ts` plus the 5 filing-status checkboxes against the real form: all 28 names exist, zero missing. They match `tax/PDF_FIELDS.md` exactly. `fillReturn` records any unresolved field in `missing[]` (never silent), and `pdf.test.ts` asserts `missing === []`. Download is flattened (test asserts 0 interactive fields remain, 2 pages). No drift found.

### Guardrail bypass — VERIFIED CORRECT
- Sixth question: enforced in code in `guardrails/budget.ts` + `tools/dispatch.ts:50-73`. `evaluateQuestion` counts distinct `questionId`s; once `questionIds.length >= 5`, a new distinct id returns `allowed:false` and the dispatcher returns a structured wrap-up error. Re-asking an already-asked id is free (does not consume budget). `budget.property.test.ts` runs 20 randomized conversations (8–19 attempts each) and confirms the cap is never exceeded. The `QuestionIdSchema` enum has exactly 5 ids, so the model cannot invent a 6th topic that passes validation.
- Negative income / out-of-enum status: validated by Zod (Layer A) in `dispatch.ts:34-41` before any tool runs. `dispatch.test.ts` confirms `additionalIncome:-500`, `filingStatus:'martian'`, and `box1Wages:-1` are all rejected with `ok:false`.
- Refusal list checked BEFORE the model call: `harness.ts:32-41` runs `checkRefusals` first; on a block it logs `guardrail_block` and returns the redirect WITHOUT calling Anthropic. Covers tax-evasion, legal/financial advice, prompt injection, and out-of-scope filing.

### Fake/stale data — VERIFIED CORRECT
Only fake artifact is `assets/sample-w2.json` (the permitted one). No mocked/hardcoded/replayed result is presented as real. The harness REFUSES to fabricate when `ANTHROPIC_API_KEY` is absent (`harness.ts:14-16` throws rather than returning a canned answer). The e2e test uses real model calls, not mocks (DECISIONS.md, confirmed in the spec). No leak found.

### State loss — VERIFIED CORRECT
Sessions persist to SQLite (`server/db.ts`, WAL). `loadSession` (`session.ts:53-60`) rehydrates from the `sessions` table when not in the in-memory cache; messages reload from the `messages` table. `persistence.test.ts` simulates a prior process by inserting straight into the DB and confirms `questionsAsked`, `answers.filingStatus`, and a turn-one fact ("Austin") all survive. A restart does not wipe an in-flight session.

### Observation gaps — MOSTLY COMPLETE (one minor nuance)
`tool_call`, `tool_result`, `question_counted`, `guardrail_block` (refusal-list), `finalize`, `user_message`, `assistant_message`, `session_start` are all appended to `data/sessions/<id>.jsonl` and exposed via `GET /api/session/:id/trace`. Events are append-only, time-ordered. Minor: when the BUDGET guardrail blocks a 6th question, that block is logged only as a `tool_result` with `ok:false` (carrying the wrap-up text), NOT as a dedicated `guardrail_block` event. It is observable, but a judge grepping for `guardrail_block` would not see the budget refusal under that type. See nit below.

## 3. Tagged findings

- MINOR — `tsconfig.json` (lib/include) + `tests/e2e/happy-path.spec.ts:35`. `npm run typecheck` fails because the root tsconfig (lib ES2022, no DOM) type-checks the Playwright e2e spec that uses `document`. Repro: `npm run typecheck`. Breaks the documented pipeline gate. The runtime/tests are unaffected (vitest and the client build both pass). Fix would be excluding `tests/e2e` from the root tsconfig or adding DOM lib for that path.

- MINOR (doc drift) — `ARCHITECTURE.md:32,105,120` and `README.md` stack line. They describe a "Haiku 4.5 classify" model and "Question budget enforced by a Haiku classifier counting distinct questions." No Haiku/classifier exists in code (grep of server/tools/guardrails/tax returns nothing); the budget is a pure in-code distinct-id counter. `DECISIONS.md:7` correctly states the Haiku classifier was dropped. The code is right; ARCHITECTURE.md/README describe a component that was never built. Defensibility risk if a judge opens ARCHITECTURE.md and looks for the classifier.

- NIT (observation) — `tools/dispatch.ts:53-58`. A budget-exhausted 6th question is logged as `tool_result ok:false`, not as a `guardrail_block` event, unlike the Layer B refusal path. AT-H6 lists `guardrail_block` among required events; the budget block does not surface under that type. It is still visible in the trace as a failed tool_result with the wrap-up remediation.

- NIT — `tax/compute2025.ts:77` and Schedule 8812. The refundable ACTC (up to 1,700, line 28) is intentionally not modeled; only the nonrefundable line-19 credit is. Documented in the code comment and SOURCES.md and in-scope for a single/joint W-2 filer, so not a defect, but a low-income filer with children would see a smaller refund than a full 1040+8812 would yield. In scope per the spec.

No defect found in: tax math, PDF field mapping, guardrail enforcement (negative/out-of-enum/refusal-before-model/6th-question), fake-data leakage, or session persistence.

## Verdict

SHIP — core correctness is solid: tax math independently verified, all 28 PDF field names exist in the real IRS form, guardrails are enforced in code (not prompt) and tested, sessions rehydrate from SQLite, and no fake data is passed off as real. The only blocker-adjacent issue is a MINOR pipeline-gate failure (`npm run typecheck` errors on the e2e spec due to root-tsconfig scope, not a product bug) plus stale ARCHITECTURE.md/README references to a Haiku classifier that does not exist. Fix the tsconfig e2e exclusion and reconcile the docs before relying on the documented one-command pipeline; neither affects the running product.
