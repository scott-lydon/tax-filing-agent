# Tasks (tax-filing-agent)

Slices, smallest shippable units. Each names its acceptance test and the architecture component it touches. Loop: implement, prove the acceptance test, vouch in a fresh context, commit, advance. Do not batch slices.

## Current slice

### Slice 0: Repo, CATA docs, dual push, render.yaml
- [x] Create GitHub repo `scott-lydon/tax-filing-agent`, clone to `/Users/scottlydon/Desktop/Clutter/iOS/tax-filing-agent`.
- [x] Dual push (GitHub + GitLab `labs.gauntletai.com/scottlydon/tax-filing-agent`); `git ls-remote` hashes match.
- [x] Five CATA docs at repo root, populated: `coding-practices.md`, `ARCHITECTURE.md`, `acceptance-tests.md`, `tasks.md`, `QA_ADVERSARY.md`.
- [x] Placeholder grep prints zero matches.
- [x] `render.yaml` with one Web Service, Node runtime, build `npm ci && npm run build`, start `npm start`.
- [ ] First commit pushes clean to both remotes.
- Acceptance: AT-D1. `git ls-remote origin main` and `git ls-remote gitlab main` print the same hash; placeholder grep prints nothing.

## Next slices

### Slice 1: Skeleton server + chat UI + health endpoint
- [ ] React + Vite + TS client, Fastify server, single `package.json` workspaces.
- [ ] Server serves `client/dist`, exposes `GET /api/health` returning `{ ok: true, version: <git sha> }`.
- [ ] Chat UI: single column, message list, input, send. Tailwind base only.
- [ ] `npm run dev` runs both; `npm run build && npm start` runs production on `:8787`.
- [ ] Render deploy succeeds; `/api/health` returns ok.
- Acceptance: AT-E1. `curl https://<live-url>/api/health` returns 200 + fresh sha; deployed UI loads the shell.

### Slice 2: Pillar 1, chat loop with persisted state
- [ ] `data/sessions.db` schema: `sessions`, `messages`.
- [ ] `POST /api/session` creates session, returns id + greeting.
- [ ] `POST /api/session/:id/message` appends user message, calls Anthropic with full history, streams response, persists.
- [ ] Server restart preserves an in-flight session.
- Acceptance: AT-H1.

### Slice 3: Pillar 2, tools including the 1040 fill tool
- [ ] `tools/schemas.ts` (Zod): `record_w2`, `record_answer`, `compute_return`, `finalize_and_render`, `ask_question`.
- [ ] Dispatcher validates with Zod; failure returns `{ ok:false, error, remediation }`.
- [ ] `finalize_and_render` writes flattened filled PDF to `data/returns/<session>.pdf` via pdf-lib.
- [ ] `GET /api/return/:id/download` streams with Content-Disposition attachment.
- Acceptance: AT-H2.

### Slice 4: Pillar 3, guardrails in code
- [ ] Layer A: every tool call through Zod; out-of-range rejected before run.
- [ ] Layer B: `guardrails/refusals.ts` hard-coded list + sealed system prompt with disclaimer.
- [ ] Layer C: `questionsAsked` counter; sixth distinct question rewritten to wrap-up (Haiku classify, cached); counter in trace.
- [ ] Per-assignment Claude checklist reviewed.
- Acceptance: AT-H3, AT-H4, AT-H5.

### Slice 5: Pillar 4, observation surface
- [ ] Append-only JSONL per session with the seven event types.
- [ ] `GET /api/session/:id/trace` returns events as JSON.
- [ ] UI collapsible "Show what the agent did" drawer, streams trace, formats tool calls, highlights blocks.
- [ ] Logger writes stdout in production too.
- Acceptance: AT-H6, AT-D3.

### Slice 6: Tax computation, real 2025 numbers
- [ ] WebSearch confirms 2025 standard deduction, brackets, 1040 line numbers; sources in `tax/SOURCES.md` with dates.
- [ ] `tax/brackets-2025.json` + `tax/compute2025.ts` pure function.
- [ ] Unit tests for boundaries by status, bracket transitions, withholding refund vs balance due.
- [ ] Wired into `compute_return`.
- Acceptance: AT-E2, AT-E4, AT-D2.

### Slice 7: Realistic fake W-2 + "Use sample" button
- [ ] `assets/sample-w2.json` matching W-2 box layout, $40,000 wages, ~10% federal withholding, all boxes.
- [ ] UI "Use sample W-2" button loads JSON as a structured user message.
- [ ] Manual paste is default; sample is a convenience.
- Acceptance: AT-C4.

### Slice 8: Conversation design, 5 questions, warm tone
- [ ] System prompt persona notes; warm, contractions, no jargon, never "as an AI".
- [ ] Each of the five questions is an `ask_question` tool call so the counter is enforced.
- [ ] Mid-conversation correction works.
- Acceptance: AT-C1, AT-C2, AT-C3.

### Slice 9: End-to-end deployment proof
- [ ] Push to main, watch Render build, verify `/api/health` sha matches.
- [ ] Run Playwright end-to-end against the live URL.
- [ ] 60-second screen recording: open URL, load sample, answer 5, download, open filled PDF.
- [ ] Deploy-verify-or-die evidence list in the commit message.
- Acceptance: AT-E3. Live URL + recording + matching sha referenced from README.

### Slice 10: DECISIONS.md and submission
- [ ] `DECISIONS.md` (half a page) covering all ten decisions.
- [ ] `README.md` with live URL, one-command local run, recording link.
- [ ] Final dual push, both remotes match.
- [ ] Save the submission URL to a notes doc on submit.
- Acceptance: submit-gate PASS on every line.

## Backlog (stretch, only after Slice 10 ships)
- [ ] Second filing status with a dependent (CTC).
- [ ] Playwright test flipping filing status at Q4.
- [ ] W-2 PDF upload with pdf-parse + Haiku extraction and malformed-W-2 recovery.
